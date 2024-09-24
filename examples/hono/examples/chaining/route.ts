import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from '@solana/actions';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../openapi';
import jupiterApi from '../../api/jupiter-api';

const LOGO =
  'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/';

const app = new OpenAPIHono();

const DEFAULT_SWAP_AMOUNT_USD = 10;

const TOKEN_DATA: Record<
  'BONK' | 'SOL',
  { address: string; decimals: number }
> = {
  SOL: { decimals: 9, address: 'So11111111111111111111111111111111111111112' },
  BONK: {
    decimals: 5,
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  },
};

type strategy = 'next' | 'terminate';

// 1st action
app.openapi(
  createRoute({
    method: 'get',
    path: '/SOL-BONK',
    tags: ['Chaining'],
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const inputToken = 'SOL';
    const outputToken = 'BONK';

    const amountParameterName = 'amount';
    const response: ActionGetResponse = {
      icon: LOGO,
      label: `Buy ${outputToken}`,
      title: `Buy ${outputToken}`,
      description: `Buy ${outputToken} with ${inputToken}. Choose a USD amount of ${inputToken} from the options below, or enter a custom amount.`,
      links: {
        actions: [
          {
            href: `/api/chaining/swap/SOL-BONK/{${amountParameterName}}/next`,
            label: `Buy ${outputToken} (chain)`,
            parameters: [
              {
                name: amountParameterName,
                label: 'Enter a custom USD amount',
              },
            ],
          },
          {
            href: `/api/chaining/swap/SOL-BONK/{${amountParameterName}}/terminate`,
            label: `Buy ${outputToken} (terminate)`,
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
    path: '/SOL-BONK/{amount}/{strategy}',
    tags: ['Chaining'],
    request: {
      params: z.object({
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
        strategy: z.string().openapi({
          param: {
            name: 'strategy',
            in: 'path',
            required: true,
          },
          type: 'string',
          example: 'next',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const inputToken = 'SOL';
    const outputToken = 'BONK';

    const response: ActionGetResponse = {
      icon: LOGO,
      label: `Buy ${outputToken}`,
      title: `Buy ${outputToken} with ${inputToken}`,
      description: `Buy ${outputToken} with ${inputToken}.`,
    };

    return c.json(response);
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/SOL-BONK/{amount}/{strategy}',
    tags: ['Chaining'],
    request: {
      params: z.object({
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
        strategy: z.string().openapi({
          param: {
            name: 'strategy',
            in: 'path',
            required: true,
          },
          type: 'string',
          example: 'next',
        }),
      }),
      body: actionSpecOpenApiPostRequestBody,
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const amount = c.req.param('amount') ?? DEFAULT_SWAP_AMOUNT_USD.toString();
    const { account } = (await c.req.json()) as ActionPostRequest;
    const strategy = c.req.param('strategy');
    const inputToken = 'SOL';
    const outputToken = 'BONK';

    const tokenUsdPrices = await jupiterApi.getTokenPricesInUsdc([
      TOKEN_DATA[inputToken].address,
    ]);

    console.log(tokenUsdPrices);
    const tokenPriceUsd = tokenUsdPrices[TOKEN_DATA[inputToken].address];

    if (!tokenPriceUsd) {
      return c.json(
        {
          message: `Failed to get price for ${inputToken}.`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    const tokenAmount = parseFloat(amount) / tokenPriceUsd.price;
    const tokenAmountFractional = Math.ceil(
      tokenAmount * 10 ** TOKEN_DATA[inputToken].decimals,
    );
    console.log(
      `Swapping ${tokenAmountFractional} ${inputToken} to ${outputToken}    
  usd amount: ${amount}
  token usd price: ${tokenPriceUsd.price}
  token amount: ${tokenAmount}
  token amount fractional: ${tokenAmountFractional}`,
    );

    const quote = await jupiterApi.quoteGet({
      inputMint: TOKEN_DATA[inputToken].address,
      outputMint: TOKEN_DATA[outputToken].address,
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
    const amountParameterName = 'amount';
    const nextAction =
      strategy === 'next'
        ? {
            type: 'action',
            icon: LOGO,
            label: `Buy ${inputToken}`,
            title: `Buy ${inputToken}`,
            description: `Buy ${inputToken} with ${outputToken}. Choose a USD amount of ${outputToken} from the options below, or enter a custom amount.`,
            links: {
              actions: [
                {
                  href: `/api/chaining/swap/BONK-SOL/{${amountParameterName}}/next`,
                  label: `Buy ${inputToken}`,
                  parameters: [
                    {
                      name: amountParameterName,
                      label: 'Enter a custom USD amount',
                    },
                  ],
                },
                {
                  href: `/api/chaining/swap/BONK-SOL/{${amountParameterName}}/terminate`,
                  label: `Buy ${inputToken} (terminate)`,
                  parameters: [
                    {
                      name: amountParameterName,
                      label: 'Enter a custom USD amount',
                    },
                  ],
                },
              ],
            },
          }
        : {
            type: 'completed',
            icon: LOGO,
            label: `Buy ${outputToken}`,
            title: `Buy ${outputToken}`,
            description: `Buy ${outputToken} with ${inputToken}. Choose a USD amount of ${inputToken} from the options below, or enter a custom amount.`,
          };
    const response: ActionPostResponse = {
      transaction: swapResponse.swapTransaction,
      links: {
        next: {
          type: 'inline',
          // output token becomes input token and vice versa
          action: nextAction,
        },
      },
    };
    return c.json(response);
  },
);

// 2-nd action

app.openapi(
  createRoute({
    method: 'get',
    path: '/BONK-SOL',
    tags: ['Chaining'],
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const inputToken = 'BONK';
    const outputToken = 'SOL';

    const amountParameterName = 'amount';
    const response: ActionGetResponse = {
      icon: LOGO,
      label: `Buy ${outputToken}`,
      title: `Buy ${outputToken}`,
      description: `Buy ${outputToken} with ${inputToken}. Choose a USD amount of ${inputToken} from the options below, or enter a custom amount.`,
      links: {
        actions: [
          {
            href: `/api/chaining/swap/SOL-BONK/{${amountParameterName}}/next`,
            label: `Buy ${outputToken} (chain)`,
            parameters: [
              {
                name: amountParameterName,
                label: 'Enter a custom USD amount',
              },
            ],
          },
          {
            href: `/api/chaining/swap/SOL-BONK/{${amountParameterName}}/terminate`,
            label: `Buy ${outputToken} (terminate)`,
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
    path: '/BONK-SOL/{amount}/{strategy}',
    tags: ['Chaining'],
    request: {
      params: z.object({
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
        strategy: z.string().openapi({
          param: {
            name: 'strategy',
            in: 'path',
            required: true,
          },
          type: 'string',
          example: 'next',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const inputToken = 'BONK';
    const outputToken = 'SOL';

    const response: ActionGetResponse = {
      icon: LOGO,
      label: `Buy ${outputToken}`,
      title: `Buy ${outputToken} with ${inputToken}`,
      description: `Buy ${outputToken} with ${inputToken}.`,
    };

    return c.json(response);
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/BONK-SOL/{amount}/{strategy}',
    tags: ['Chaining'],
    request: {
      params: z.object({
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
        strategy: z.string().openapi({
          param: {
            name: 'strategy',
            in: 'path',
            required: true,
          },
          type: 'string',
          example: 'next',
        }),
      }),
      body: actionSpecOpenApiPostRequestBody,
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const amount = c.req.param('amount') ?? DEFAULT_SWAP_AMOUNT_USD.toString();
    const { account } = (await c.req.json()) as ActionPostRequest;
    const inputToken = 'BONK';
    const outputToken = 'SOL';
    const strategy = c.req.param('strategy');

    const tokenUsdPrices = await jupiterApi.getTokenPricesInUsdc([
      TOKEN_DATA[inputToken].address,
    ]);
    const tokenPriceUsd = tokenUsdPrices[TOKEN_DATA[inputToken].address];

    if (!tokenPriceUsd) {
      return c.json(
        {
          message: `Failed to get price for ${inputToken}.`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    const tokenAmount = parseFloat(amount) / tokenPriceUsd.price;
    const tokenAmountFractional = Math.ceil(
      tokenAmount * 10 ** TOKEN_DATA[inputToken].decimals,
    );
    console.log(
      `Swapping ${tokenAmountFractional} ${inputToken} to ${outputToken}    
  usd amount: ${amount}
  token usd price: ${tokenPriceUsd.price}
  token amount: ${tokenAmount}
  token amount fractional: ${tokenAmountFractional}`,
    );

    const quote = await jupiterApi.quoteGet({
      inputMint: TOKEN_DATA[inputToken].address,
      outputMint: TOKEN_DATA[outputToken].address,
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
    const amountParameterName = 'amount';
    const nextAction =
      strategy === 'next'
        ? {
            type: 'action',
            icon: LOGO,
            label: `Buy ${inputToken}`,
            title: `Buy ${inputToken}`,
            description: `Buy ${inputToken} with ${outputToken}. Choose a USD amount of ${outputToken} from the options below, or enter a custom amount.`,
            links: {
              actions: [
                {
                  href: `/api/chaining/swap/SOL-BONK/{${amountParameterName}}/next`,
                  label: `Buy ${inputToken}`,
                  parameters: [
                    {
                      name: amountParameterName,
                      label: 'Enter a custom USD amount',
                    },
                  ],
                },
                {
                  href: `/api/chaining/swap/SOL-BONK/{${amountParameterName}}/terminate`,
                  label: `Buy ${inputToken} (terminate)`,
                  parameters: [
                    {
                      name: amountParameterName,
                      label: 'Enter a custom USD amount',
                    },
                  ],
                },
              ],
            },
          }
        : {
            type: 'completed',
            icon: LOGO,
            label: `Buy ${outputToken}`,
            title: `Buy ${outputToken}`,
            description: `Buy ${outputToken} with ${inputToken}. Choose a USD amount of ${inputToken} from the options below, or enter a custom amount.`,
          };
    const response: ActionPostResponse = {
      transaction: swapResponse.swapTransaction,
      links: {
        next: {
          type: 'inline',
          // output token becomes input token and vice versa
          action: nextAction,
        },
      },
    };
    return c.json(response);
  },
);

export default app;
