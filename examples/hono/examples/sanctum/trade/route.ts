import { LstList } from 'sanctum-lst-list';
import { LST } from 'sanctum-lst-list';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from '@solana/actions';
import jupiterApi from '../../../api/jupiter-api';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../../openapi';

const SANCTUM_ACTION_ICON =
  'https://ucarecdn.com/e75cce91-c367-4f74-9ffe-2b6d63398ce1/-/preview/880x864/-/quality/smart/-/format/auto/';
const SWAP_AMOUNT_SOL_OPTIONS = [1, 5, 10];
const DEFAULT_SWAP_AMOUNT_SOL = 1;

const app = new OpenAPIHono();

// original url: https://app.sanctum.so/trade/SOL-bonkSOL
app.openapi(
  createRoute({
    method: 'get',
    path: '/{tokenPair}',
    tags: ['Sanctum Swap'],
    request: {
      params: z.object({
        tokenPair: z.string().openapi({
          param: {
            name: 'tokenPair',
            in: 'path',
          },
          type: 'string',
          example: 'SOL-hSOL',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  (c) => {
    const tokenPair = c.req.param('tokenPair');
    const [inputToken, outputToken] = tokenPair.split('-');

    const [inputTokenMeta, outputTokenMeta] = [
      LstList.find(
        (it: LST) => it.symbol.toLowerCase() === inputToken.toLowerCase(),
      ),
      LstList.find(
        (it: LST) => it.symbol.toLowerCase() === outputToken.toLowerCase(),
      ),
    ];

    if (!inputTokenMeta || !outputTokenMeta) {
      return c.json(
        {
          message: 'Invalid token pair',
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    if (inputToken !== 'SOL') {
      return c.json(
        {
          message: 'Invalid input token',
        } satisfies ActionError,
        {
          status: 400,
        },
      );
    }

    const amountParameterName = 'amount';
    const response: ActionGetResponse = {
      icon: SANCTUM_ACTION_ICON,
      label: `Buy ${outputTokenMeta.symbol}`,
      title: `Buy ${outputTokenMeta.symbol}`,
      description: `Buy ${outputTokenMeta.symbol} with ${inputTokenMeta.symbol}. Choose a SOL amount from the options below, or enter a custom amount.`,
      links: {
        actions: [
          ...SWAP_AMOUNT_SOL_OPTIONS.map((amount) => ({
            label: `${amount} SOL`,
            href: `/api/sanctum/trade/${tokenPair}/${amount}`,
          })),
          {
            href: `/api/sanctum/trade/${tokenPair}/{${amountParameterName}}`,
            label: `Buy ${outputTokenMeta.symbol}`,
            parameters: [
              {
                name: amountParameterName,
                label: 'Enter a SOL amount',
              },
            ],
          },
        ],
      },
    };

    return c.json(response);
  },
);

// original url: https://app.sanctum.so/trade/SOL-bonkSOL
app.openapi(
  createRoute({
    method: 'get',
    path: '/{tokenPair}/{amount}',
    tags: ['Sanctum Swap'],
    request: {
      params: z.object({
        tokenPair: z.string().openapi({
          param: {
            name: 'tokenPair',
            in: 'path',
          },
          type: 'string',
          example: 'SOL-hSOL',
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
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  (c) => {
    const { tokenPair, amount } = c.req.param();
    const [inputToken, outputToken] = tokenPair.split('-');
    const [inputTokenMeta, outputTokenMeta] = [
      LstList.find(
        (it: LST) => it.symbol.toLowerCase() === inputToken.toLowerCase(),
      ),
      LstList.find(
        (it: LST) => it.symbol.toLowerCase() === outputToken.toLowerCase(),
      ),
    ];

    if (!inputTokenMeta || !outputTokenMeta) {
      console.error(
        `Token metadata not found for ${inputToken} or ${outputToken}`,
      );
      return c.json(
        {
          message: 'Invalid token pair',
        } satisfies ActionError,
        {
          status: 400,
        },
      );
    }

    if (inputToken !== 'SOL') {
      return c.json(
        {
          message: 'Invalid input token',
        } satisfies ActionError,
        {
          status: 400,
        },
      );
    }

    const response: ActionGetResponse = {
      icon: SANCTUM_ACTION_ICON,
      label: `Buy ${outputTokenMeta.symbol}`,
      title: `Buy ${outputTokenMeta.symbol}`,
      description: `Buy ${outputTokenMeta.symbol} with ${inputTokenMeta.symbol}.`,
    };

    return c.json(response);
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/{tokenPair}/{amount}',
    tags: ['Sanctum Swap'],
    request: {
      params: z.object({
        tokenPair: z.string().openapi({
          param: {
            name: 'tokenPair',
            in: 'path',
          },
          type: 'string',
          example: 'SOL-hSOL',
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
    const tokenPair = c.req.param('tokenPair');
    const amount = c.req.param('amount') ?? DEFAULT_SWAP_AMOUNT_SOL.toString();
    try {
      const { account } = (await c.req.json()) as ActionPostRequest;

      const [inputToken, outputToken] = tokenPair.split('-');
      const [inputTokenMeta, outputTokenMeta] = [
        LstList.find(
          (it: LST) => it.symbol.toLowerCase() === inputToken.toLowerCase(),
        ),
        LstList.find(
          (it: LST) => it.symbol.toLowerCase() === outputToken.toLowerCase(),
        ),
      ];

      if (!inputTokenMeta || !outputTokenMeta) {
        return c.json(
          {
            message: 'Invalid token pair',
          } satisfies ActionError,
          {
            status: 400,
          },
        );
      }

      const tokenAmount = parseFloat(amount);
      const tokenAmountFractional = Math.ceil(
        tokenAmount * 10 ** inputTokenMeta.decimals,
      );
      console.log(
        `Swapping ${tokenAmountFractional} ${inputTokenMeta.symbol} to ${outputTokenMeta.symbol}    
    ${inputTokenMeta.symbol} amount: ${amount}
    token amount fractional: ${tokenAmountFractional}`,
      );

      const quote = await jupiterApi.quoteGet({
        inputMint: inputTokenMeta.mint,
        outputMint: outputTokenMeta.mint,
        amount: tokenAmountFractional,
        autoSlippage: true,
        maxAutoSlippageBps: 500, // 5%,
      });
      const swapResponse = await jupiterApi.swapPost({
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: account,
          prioritizationFeeLamports: 'auto',
        },
      });
      const response: ActionPostResponse = {
        transaction: swapResponse.swapTransaction,
      };
      return c.json(response);
    } catch (e) {
      console.error(
        `Failed to prepare swap tx for pair ${tokenPair}, amount ${amount}`,
        e,
      );
      return c.json(
        {
          message: `Failed to prepare transaction`,
        } as ActionError,
        {
          status: 500,
        },
      );
    }
  },
);

export default app;
