import { PublicKey, Transaction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ENV, TokenInfo } from '@solana/spl-token-registry';
import AmmImpl from '@mercurial-finance/dynamic-amm-sdk';
import * as math from 'mathjs';
import { connection } from '../shared/connection';
import { createJupiterApi, JupiterTokenMetadata } from './jupiter-api';

interface Tokens {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  tags: string[];
  daily_volume: number;
}

export const createSwapTx = async (
  userPublicKey: PublicKey,
  poolAddress: string,
  usdcAmount: string,
  tokenAMeta: Tokens,
  tokenBMeta: Tokens,
  inTokenMeta: Tokens,
  referrer: string | null,
): Promise<Transaction> => {
  const tokenAInfo: TokenInfo = {
    address: tokenAMeta?.address ?? '',
    chainId: ENV.MainnetBeta,
    decimals: tokenAMeta?.decimals ?? 0,
    name: tokenAMeta?.name ?? '',
    symbol: tokenAMeta?.symbol ?? '',
  };
  const tokenBInfo: TokenInfo = {
    address: tokenBMeta?.address ?? '',
    chainId: ENV.MainnetBeta,
    decimals: tokenBMeta?.decimals ?? 0,
    name: tokenBMeta?.name ?? '',
    symbol: tokenBMeta?.symbol ?? '',
  };

  const ammPool = await AmmImpl.create(
    connection,
    new PublicKey(poolAddress),
    tokenAInfo,
    tokenBInfo,
  );

  const { getTokenPricesInUsdc } = createJupiterApi();
  const inToken = new PublicKey(inTokenMeta.address);
  const prices = await getTokenPricesInUsdc([inToken.toString()]);
  const tokenPriceUsd = prices[inToken.toString()];

  const amount = parseFloat(usdcAmount) / tokenPriceUsd.price;

  const swapAmount = new BN(
    math
      .bignumber(amount)
      .mul(10 ** inTokenMeta.decimals)
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

export const getTokenPairMetadata = async (
  poolAddress: string,
  baseToken: string,
): Promise<{
  tokenAMint: string;
  tokenBMint: string;
  tokenAMeta: Tokens;
  tokenBMeta: Tokens;
  inTokenMint: string;
  outTokenMint: string;
  inTokenMeta: Tokens;
  outTokenMeta: Tokens;
}> => {
  const poolData = await fetch(
    `https://amm-v2.meteora.ag/pools?address=${poolAddress}`,
  ).then((res) => res.json());
  const poolDetails = poolData[0];
  const [tokenAMint, tokenBMint] = poolDetails.pool_token_mints;
  const [tokenAMeta, tokenBMeta]: Tokens[] = await Promise.all([
    fetch(`https://tokens.jup.ag/token/${tokenAMint}`).then((res) =>
      res.json(),
    ),
    fetch(`https://tokens.jup.ag/token/${tokenBMint}`).then((res) =>
      res.json(),
    ),
  ]);

  return tokenAMeta?.address === baseToken
    ? {
        tokenAMint: tokenAMint,
        tokenBMint: tokenBMint,
        tokenAMeta: tokenAMeta,
        tokenBMeta: tokenBMeta,
        inTokenMint: tokenBMint,
        outTokenMint: tokenAMint,
        inTokenMeta: tokenBMeta,
        outTokenMeta: tokenAMeta,
      }
    : {
        tokenAMint: tokenAMint,
        tokenBMint: tokenBMint,
        tokenAMeta: tokenAMeta,
        tokenBMeta: tokenBMeta,
        inTokenMint: tokenAMint,
        outTokenMint: tokenBMint,
        inTokenMeta: tokenAMeta,
        outTokenMeta: tokenBMeta,
      };
};
