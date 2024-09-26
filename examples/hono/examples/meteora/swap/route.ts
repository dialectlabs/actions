import { TokenInfo } from '@solana/spl-token-registry';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createSwapTx, getTokenPair } from '../../../api/meteora-api';
import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from '@solana/actions';
import jupiterApi from '../../../api/jupiter-api';
import { USDollar } from '../../../shared/number-formatting-utils';
import { Hono } from 'hono';

export const METEORA_ACTION_ICON =
  'https://ucarecdn.com/59f7bf50-bbe0-43c7-a282-badebeea3a6b/-/preview/880x880/-/quality/smart/-/format/auto/';
const SWAP_AMOUNT_USD_OPTIONS = [10, 100, 1000];
const DEFAULT_SWAP_AMOUNT_USD = 10;

const app = new Hono();

// original url: https://app.meteora.ag/dlmm/Gu6QyuQHvssuHhLcRRjeuJtYWKdZbV6e4kngsJRekNaM
app.get('/:poolAddress', async (c) => {
    const poolAddress = c.req.param('poolAddress');
    const { token, referrer } = c.req.valid('query');

    const [inputToken, outputToken] = await getTokenPair(poolAddress, token);

    const tokenList: TokenInfo[] = await fetch('https://token.jup.ag/all').then(
      (res) => res.json(),
    );
    const inputTokenMeta = tokenList.find(
      (item) => item && item.address === inputToken.toBase58(),
    );
    const outputTokenMeta = tokenList.find(
      (item) => item && item.address === outputToken.toBase58(),
    );

    console.log({ inputTokenMeta, outputTokenMeta });
    if (!inputTokenMeta || !outputTokenMeta) {
      return c.json({
        icon: METEORA_ACTION_ICON,
        label: 'Not Available',
        title: `Buy ${outputToken}`,
        description: `Buy ${outputToken} with ${inputToken}.`,
        disabled: true,
        error: {
          message: `Token metadata not found.`,
        },
      } satisfies ActionGetResponse);
    }

    const amountParameterName = 'amount';
    const response: ActionGetResponse = {
      icon: METEORA_ACTION_ICON,
      label: `Buy ${outputTokenMeta.symbol}`,
      title: `Buy ${outputTokenMeta.symbol}`,
      description: `Buy ${outputTokenMeta.symbol} with ${inputTokenMeta.symbol}. Choose a USD amount of ${inputTokenMeta.symbol} from the options below, or enter a custom amount.`,
      links: {
        actions: [
          ...SWAP_AMOUNT_USD_OPTIONS.map((amount) => ({
            label: `${USDollar.format(amount)}`,
            href: `/api/meteora/swap/${poolAddress}/${amount}?token=${token}&referrer=${referrer || ''}`,
          })),
          {
            href: `/api/meteora/swap/${poolAddress}/{${amountParameterName}}?token=${token}&referrer=${referrer || ''}`,
            label: `Buy ${outputTokenMeta.symbol}`,
            parameters: [
              {
                name: amountParameterName,
                label: 'Enter a custom USD amount',
              },
            ],
          },
        ],
      },
    };

    return c.json(response);
  },
);

app.get('/:poolAddress/:amount', async (c) => {
    const poolAddress = c.req.param('poolAddress');
    const { token } = c.req.valid('query');

    const [inputToken, outputToken] = await getTokenPair(poolAddress, token);

    const tokenList: TokenInfo[] = await fetch('https://token.jup.ag/all').then(
      (res) => res.json(),
    );
    const inputTokenMeta = tokenList.find(
      (item) => item && item.address === inputToken.toBase58(),
    );
    const outputTokenMeta = tokenList.find(
      (item) => item && item.address === outputToken.toBase58(),
    );

    console.log({ inputTokenMeta, outputTokenMeta });
    if (!inputTokenMeta || !outputTokenMeta) {
      return c.json({
        icon: METEORA_ACTION_ICON,
        label: 'Not Available',
        title: `Buy ${outputToken}`,
        description: `Buy ${outputToken} with ${inputToken}.`,
        disabled: true,
        error: {
          message: `Token metadata not found.`,
        },
      } satisfies ActionGetResponse);
    }

    const response: ActionGetResponse = {
      icon: METEORA_ACTION_ICON,
      label: `Buy ${outputTokenMeta.symbol}`,
      title: `Buy ${outputTokenMeta.symbol} with ${inputTokenMeta.symbol}`,
      description: `Buy ${outputTokenMeta.symbol} with ${inputTokenMeta.symbol}.`,
    };

    return c.json(response);
  },
);

app.post('/:poolAddress/:amount?', async (c) => {
    const poolAddress = c.req.param('poolAddress');
    const amount = c.req.param('amount') ?? DEFAULT_SWAP_AMOUNT_USD;
    const { token, referrer } = c.req.valid('query');
    try {
      const { account } = (await c.req.json()) as ActionPostRequest;

      const [inputToken, outputToken] = await getTokenPair(poolAddress, token);

      const tokenList: TokenInfo[] = await fetch(
        'https://token.jup.ag/all',
      ).then((res) => res.json());
      const inputTokenMeta = tokenList.find(
        (item) => item && item.address === inputToken.toBase58(),
      );
      const outputTokenMeta = tokenList.find(
        (item) => item && item.address === outputToken.toBase58(),
      );

      console.log({ inputTokenMeta, outputTokenMeta });
      if (!inputTokenMeta || !outputTokenMeta) {
        return c.json(
          {
            message: `Token metadata not found.`,
          } satisfies ActionError,
          {
            status: 400,
          },
        );
      }
      const tokenUsdPrices = await jupiterApi.getTokenPricesInUsdc([
        inputTokenMeta.address,
      ]);
      const tokenPriceUsd = tokenUsdPrices[inputTokenMeta.address];
      if (!tokenPriceUsd) {
        return c.json(
          {
            message: `Failed to get price for ${inputTokenMeta.symbol}.`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }
      const tokenAmount = parseFloat(amount) / tokenPriceUsd.price;
      const tokenAmountFractional = Math.ceil(
        tokenAmount * 10 ** inputTokenMeta.decimals,
      );
      console.log(
        `Swapping ${tokenAmountFractional} ${inputTokenMeta.symbol} to ${outputTokenMeta.symbol}    
    usd amount: ${amount}
    token usd price: ${tokenPriceUsd.price}
    token amount: ${tokenAmount}
    token amount fractional: ${tokenAmountFractional}`,
      );

      const transaction: Transaction = await createSwapTx(
        new PublicKey(account),
        poolAddress,
        amount,
        token,
        referrer,
      );
      const response: ActionPostResponse = {
        transaction: Buffer.from(
          transaction.serialize({ verifySignatures: false }),
        ).toString(`base64`),
      };
      return c.json(response);
    } catch (e) {
      console.error(
        `Failed to prepare swap tx for pool ${poolAddress}, amount ${amount}`,
        e,
      );
      return c.json(
        {
          message: `Failed to prepare transaction`,
        } satisfies ActionError,
        {
          status: 500,
        },
      );
    }
  },
);

export default app;
