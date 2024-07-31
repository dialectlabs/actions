import { PublicKey, Transaction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { TokenInfo } from '@solana/spl-token-registry';
import AmmImpl from '@mercurial-finance/dynamic-amm-sdk';
import * as math from 'mathjs';
import { connection } from '../shared/connection';
import { createJupiterApi } from './jupiter-api';

export const createSwapTx = async (
  userPublicKey: PublicKey,
  poolAddress: string,
  usdcAmount: string,
  token: string,
  referrer: string | null,
): Promise<Transaction> => {
  const poolData = await fetch(
    `https://amm.meteora.ag/pools?address=${poolAddress}`,
  ).then((res) => res.json());
  const poolDetails = poolData[0];

  const tokenList: TokenInfo[] = await fetch('https://token.jup.ag/all').then(
    (res) => res.json(),
  );
  const tokenADetails = tokenList.find(
    (item) => item && item.address === poolDetails.pool_token_mints[0],
  )!;
  const tokenBDetails = tokenList.find(
    (item) => item && item.address === poolDetails.pool_token_mints[1],
  )!;

  const ammPool = await AmmImpl.create(
    connection,
    new PublicKey(poolAddress),
    tokenADetails,
    tokenBDetails,
  );

  const inTokenDetails =
    tokenADetails.address === token ? tokenBDetails : tokenADetails;

  const { getTokenPricesInUsdc } = createJupiterApi();
  const inToken = new PublicKey(inTokenDetails.address);
  const prices = await getTokenPricesInUsdc([inToken.toString()]);
  const tokenPriceUsd = prices[inToken.toString()];

  const amount = parseFloat(usdcAmount) / tokenPriceUsd.price;

  const swapAmount = new BN(
    math
      .bignumber(amount)
      .mul(10 ** inTokenDetails.decimals)
      .floor()
      .toString(),
  );

  // Swap quote
  const swapQuote = ammPool.getSwapQuote(inToken, swapAmount, 10);

  // Swap
  const referrerKey = !referrer === false ? new PublicKey(referrer) : undefined;
  const swapTx = await ammPool.swap(
    userPublicKey,
    inToken,
    swapAmount,
    swapQuote.minSwapOutAmount,
    referrerKey,
  );
  return swapTx;
};

export const getTokenPair = async (
  poolAddress: string,
  token: string,
): Promise<[PublicKey, PublicKey]> => {
  const poolData = await fetch(
    `https://amm.meteora.ag/pools?address=${poolAddress}`,
  ).then((res) => res.json());
  const poolDetails = poolData[0];
  const tokenList: TokenInfo[] = await fetch('https://token.jup.ag/all').then(
    (res) => res.json(),
  );

  const tokenA = tokenList.find(
    (token) => token && token.address === poolDetails.pool_token_mints[0],
  );
  const tokenB = tokenList.find(
    (token) => token && token.address === poolDetails.pool_token_mints[1],
  );

  const inToken = tokenA!.address === token ? tokenB : tokenA;
  const outToken = tokenA!.address === token ? tokenA : tokenB;
  return [new PublicKey(inToken!.address), new PublicKey(outToken!.address)];
};
