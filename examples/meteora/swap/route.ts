import { TokenInfo } from '@solana/spl-token-registry';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createSwapTx, getTokenPairMetadata } from '../../../api/meteora-api';
import {
  ActionError,
  ActionGetResponse,
  ActionPostResponse,
} from '@solana/actions';
import jupiterApi from '../../../api/jupiter-api';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../../openapi';
import { USDollar } from '../../../shared/number-formatting-utils';

export const METEORA_ACTION_ICON =
  'https://ucarecdn.com/59f7bf50-bbe0-43c7-a282-badebeea3a6b/-/preview/880x880/-/quality/smart/-/format/auto/';
const SWAP_AMOUNT_USD_OPTIONS = [10, 100, 1000];
const DEFAULT_SWAP_AMOUNT_USD = 10;

const app = new OpenAPIHono();

// original url: https://app.meteora.ag/dlmm/Gu6QyuQHvssuHhLcRRjeuJtYWKdZbV6e4kngsJRekNaM
app.openapi(
  createRoute({
    method: 'get',
    path: '/{poolAddress}',
    tags: ['Meteora Swap'],
    request: {
      query: z.object({
        token: z.string().openapi({
          param: {
            name: 'token',
            in: 'query',
            required: true,
          },
          type: 'string',
        }),
        referrer: z.string().openapi({
          param: {
            name: 'referrer',
            in: 'query',
            required: true,
          },
          type: 'string',
        }),
      }),
      params: z.object({
        poolAddress: z.string().openapi({
          param: {
            name: 'poolAddress',
            in: 'path',
          },
          type: 'string',
          example: 'u6QyuQHvssuHhLcRRjeuJtYWKdZbV6e4kngsJRekNaM',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const poolAddress = c.req.param('poolAddress');
    const { token, referrer } = c.req.valid('query');

    const { inTokenMeta, outTokenMeta, inTokenMint, outTokenMint } =
      await getTokenPairMetadata(poolAddress, token);

    console.log({ inTokenMeta, outTokenMeta });
    if (!inTokenMeta || !outTokenMeta) {
      return c.json({
        icon: METEORA_ACTION_ICON,
        label: 'Not Available',
        title: `Buy ${outTokenMint}`,
        description: `Buy ${outTokenMint} with ${inTokenMint}.`,
        disabled: true,
        error: {
          message: `Token metadata not found.`,
        },
      } satisfies ActionGetResponse);
    }

    const amountParameterName = 'amount';
    const response: ActionGetResponse = {
      icon: METEORA_ACTION_ICON,
      label: `Buy ${outTokenMeta.symbol}`,
      title: `Buy ${outTokenMeta.symbol}`,
      description: `Buy ${outTokenMeta.symbol} with ${inTokenMeta.symbol}. Choose a USD amount of ${inTokenMeta.symbol} from the options below, or enter a custom amount.`,
      links: {
        actions: [
          ...SWAP_AMOUNT_USD_OPTIONS.map((amount) => ({
            label: `${USDollar.format(amount)}`,
            href: `/api/meteora/swap/${poolAddress}/${amount}?token=${token}&referrer=${referrer || ''}`,
          })),
          {
            href: `/api/meteora/swap/${poolAddress}/{${amountParameterName}}?token=${token}&referrer=${referrer || ''}`,
            label: `Buy ${outTokenMeta.symbol}`,
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

app.openapi(
  createRoute({
    method: 'get',
    path: '/{poolAddress}/{amount}',
    tags: ['Meteora Swap'],
    request: {
      query: z.object({
        token: z.string().openapi({
          param: {
            name: 'token',
            in: 'query',
            required: true,
          },
          type: 'string',
        }),
      }),
      params: z.object({
        poolAddress: z.string().openapi({
          param: {
            name: 'poolAddress',
            in: 'path',
          },
          type: 'string',
          example: 'u6QyuQHvssuHhLcRRjeuJtYWKdZbV6e4kngsJRekNaM',
        }),
        amount: z.string().openapi({
          param: {
            name: 'amount',
            in: 'path',
          },
          type: 'number',
          example: '1',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const poolAddress = c.req.param('poolAddress');
    const { token } = c.req.valid('query');

    const { inTokenMeta, outTokenMeta, inTokenMint, outTokenMint } =
      await getTokenPairMetadata(poolAddress, token);

    console.log({ inTokenMeta, outTokenMeta });
    if (!inTokenMeta || !outTokenMeta) {
      return c.json({
        icon: METEORA_ACTION_ICON,
        label: 'Not Available',
        title: `Buy ${outTokenMint}`,
        description: `Buy ${outTokenMint} with ${inTokenMint}.`,
        disabled: true,
        error: {
          message: `Token metadata not found.`,
        },
      } satisfies ActionGetResponse);
    }

    const response: ActionGetResponse = {
      icon: METEORA_ACTION_ICON,
      label: `Buy ${outTokenMeta.symbol}`,
      title: `Buy ${outTokenMeta.symbol} with ${inTokenMeta.symbol}`,
      description: `Buy ${outTokenMeta.symbol} with ${inTokenMeta.symbol}.`,
    };

    return c.json(response);
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/{poolAddress}/{amount}',
    tags: ['Meteora Swap'],
    request: {
      query: z.object({
        token: z.string().openapi({
          param: {
            name: 'token',
            in: 'query',
            required: true,
          },
          type: 'string',
        }),
        referrer: z.string().openapi({
          param: {
            name: 'referrer',
            in: 'query',
            required: true,
          },
          type: 'string',
        }),
      }),
      params: z.object({
        poolAddress: z.string().openapi({
          param: {
            name: 'poolAddress',
            in: 'path',
          },
          type: 'string',
          example: 'u6QyuQHvssuHhLcRRjeuJtYWKdZbV6e4kngsJRekNaM',
        }),
        amount: z
          .string()
          .optional()
          .openapi({
            param: {
              name: 'amount',
              in: 'path',
              required: false,
            },
            type: 'number',
            example: '1',
          }),
      }),
      body: actionSpecOpenApiPostRequestBody,
    },
    responses: actionsSpecOpenApiPostResponse,
  }),
  async (c) => {
    const poolAddress = c.req.param('poolAddress');
    const amount = c.req.param('amount') ?? DEFAULT_SWAP_AMOUNT_USD;
    const { token, referrer } = c.req.valid('query');
    try {
      const [
        { account },
        { inTokenMeta, outTokenMeta, tokenAMeta, tokenBMeta },
      ] = await Promise.all([
        c.req.json(),
        getTokenPairMetadata(poolAddress, token),
      ]);

      console.log({ inTokenMeta, outTokenMeta });
      if (!inTokenMeta || !outTokenMeta) {
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
        inTokenMeta.address,
      ]);
      const tokenPriceUsd = tokenUsdPrices[inTokenMeta.address];
      if (!tokenPriceUsd) {
        return c.json(
          {
            message: `Failed to get price for ${inTokenMeta.symbol}.`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }
      const tokenAmount = parseFloat(amount) / tokenPriceUsd.price;
      const tokenAmountFractional = Math.ceil(
        tokenAmount * 10 ** inTokenMeta.decimals,
      );
      console.log(
        `Swapping ${tokenAmountFractional} ${inTokenMeta.symbol} to ${outTokenMeta.symbol}    
    usd amount: ${amount}
    token usd price: ${tokenPriceUsd.price}
    token amount: ${tokenAmount}
    token amount fractional: ${tokenAmountFractional}`,
      );

      const transaction: Transaction = await createSwapTx(
        new PublicKey(account),
        poolAddress,
        amount,
        tokenAMeta!,
        tokenBMeta!,
        inTokenMeta,
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
