import {
  Action,
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse, CompletedAction,
} from '@solana/actions';
import jupiterApi from '../../../api/jupiter-api';
import { Hono } from 'hono';

const SOL_BONK_LOGO = 'https://ucarecdn.com/a1dacc03-ec1b-43a9-a492-1c549291b55a/-/preview/880x582/';
const BONK_SOL_LOGO = 'https://ucarecdn.com/f86fb716-bd20-4865-95b8-fb4599ec74c5/-/preview/880x582/';

const app = new Hono();

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
app.get('/SOL-BONK', async (c) => {
    const inputToken = 'SOL';
    const outputToken = 'BONK';

    const amountParameterName = 'amount';
    const response: ActionGetResponse = {
      icon: SOL_BONK_LOGO,
      label: `Buy ${outputToken}`,
      title: `Buy ${outputToken}`,
      description: `Buy ${outputToken} with ${inputToken}. Choose a USD amount of ${inputToken} from the options below, or enter a custom amount.`,
      links: {
        actions: [
          {
            type: 'transaction',
            href: `/api/chaining/inline/swap/SOL-BONK/{${amountParameterName}}/next`,
            label: `Buy ${outputToken} (chain)`,
            parameters: [
              {
                name: amountParameterName,
                label: 'Enter a custom USD amount',
              },
            ],
          },
          {
            type: 'transaction',
            href: `/api/chaining/inline/swap/SOL-BONK/{${amountParameterName}}/terminate`,
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

app.get('/SOL-BONK/:amount/:strategy', async (c) => {
    const inputToken = 'SOL';
    const outputToken = 'BONK';

    const response: ActionGetResponse = {
      icon: SOL_BONK_LOGO,
      label: `Buy ${outputToken}`,
      title: `Buy ${outputToken} with ${inputToken}`,
      description: `Buy ${outputToken} with ${inputToken}.`,
    };

    return c.json(response);
  },
);

app.post('/SOL-BONK/:amount/:strategy', async (c) => {
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
    const nextAction: Action | CompletedAction =
      strategy === 'next'
        ? {
          type: 'action',
          icon: BONK_SOL_LOGO,
          label: `Buy ${inputToken}`,
          title: `Buy ${inputToken}`,
          description: `Buy ${inputToken} with ${outputToken}. Choose a USD amount of ${outputToken} from the options below, or enter a custom amount.`,
          links: {
            actions: [
              {
                type: 'transaction',
                href: `/api/chaining/inline/swap/BONK-SOL/{${amountParameterName}}/next`,
                label: `Buy ${inputToken}`,
                parameters: [
                  {
                    name: amountParameterName,
                    label: 'Enter a custom USD amount',
                  },
                ],
              },
              {
                type: 'transaction',
                href: `/api/chaining/inline/swap/BONK-SOL/{${amountParameterName}}/terminate`,
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
          icon: SOL_BONK_LOGO,
          label: `Buy ${outputToken}`,
          title: `Buy ${outputToken}`,
          description: `Buy ${outputToken} with ${inputToken}. Choose a USD amount of ${inputToken} from the options below, or enter a custom amount.`,
        };
    const response: ActionPostResponse = {
      type: 'transaction',
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

app.get('/BONK-SOL', async (c) => {
    const inputToken = 'BONK';
    const outputToken = 'SOL';

    const amountParameterName = 'amount';
    const response: ActionGetResponse = {
      icon: BONK_SOL_LOGO,
      label: `Buy ${outputToken}`,
      title: `Buy ${outputToken}`,
      description: `Buy ${outputToken} with ${inputToken}. Choose a USD amount of ${inputToken} from the options below, or enter a custom amount.`,
      links: {
        actions: [
          {
            type: 'transaction',
            href: `/api/chaining/inline/swap/SOL-BONK/{${amountParameterName}}/next`,
            label: `Buy ${outputToken} (chain)`,
            parameters: [
              {
                name: amountParameterName,
                label: 'Enter a custom USD amount',
              },
            ],
          },
          {
            type: 'transaction',
            href: `/api/chaining/inline/swap/SOL-BONK/{${amountParameterName}}/terminate`,
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

app.get('/BONK-SOL/:amount/:strategy', async (c) => {
    const inputToken = 'BONK';
    const outputToken = 'SOL';

    const response: ActionGetResponse = {
      icon: BONK_SOL_LOGO,
      label: `Buy ${outputToken}`,
      title: `Buy ${outputToken} with ${inputToken}`,
      description: `Buy ${outputToken} with ${inputToken}.`,
    };

    return c.json(response);
  },
);

app.post('/BONK-SOL/:amount/:strategy', async (c) => {
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
    const nextAction: Action | CompletedAction =
      strategy === 'next'
        ? {
          type: 'action',
          icon: SOL_BONK_LOGO,
          label: `Buy ${inputToken}`,
          title: `Buy ${inputToken}`,
          description: `Buy ${inputToken} with ${outputToken}. Choose a USD amount of ${outputToken} from the options below, or enter a custom amount.`,
          links: {
            actions: [
              {
                type: 'transaction',
                href: `/api/chaining/inline/swap/SOL-BONK/{${amountParameterName}}/next`,
                label: `Buy ${inputToken}`,
                parameters: [
                  {
                    name: amountParameterName,
                    label: 'Enter a custom USD amount',
                  },
                ],
              },
              {
                type: 'transaction',
                href: `/api/chaining/inline/swap/SOL-BONK/{${amountParameterName}}/terminate`,
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
          icon: BONK_SOL_LOGO,
          label: `Buy ${outputToken}`,
          title: `Buy ${outputToken}`,
          description: `Buy ${outputToken} with ${inputToken}. Choose a USD amount of ${inputToken} from the options below, or enter a custom amount.`,
        };
    const response: ActionPostResponse = {
      type: 'transaction',
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
