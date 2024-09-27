import { Hono } from 'hono';
import {
  Action,
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from '@solana/actions';
import jupiterApi from '../../../api/jupiter-api';

const LOGO =
  'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/';

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

// 1st action
app.get('/SOL-BONK', async (c) => {
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
          type: 'transaction',
          href: `/api/chaining/post/swap/SOL-BONK/{${amountParameterName}}`,
          label: `Buy ${outputToken} (chain)`,
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
});

app.get('/SOL-BONK/:amount', async (c) => {
  const inputToken = 'SOL';
  const outputToken = 'BONK';

  const response: ActionGetResponse = {
    icon: LOGO,
    label: `Buy ${outputToken}`,
    title: `Buy ${outputToken} with ${inputToken}`,
    description: `Buy ${outputToken} with ${inputToken}.`,
  };

  return c.json(response);
});

app.post('/SOL-BONK/:amount', async (c) => {
  const amount = c.req.param('amount') ?? DEFAULT_SWAP_AMOUNT_USD.toString();
  const { account } = (await c.req.json()) as ActionPostRequest;
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
  const response: ActionPostResponse = {
    transaction: swapResponse.swapTransaction,
    links: {
      next: {
        type: 'post',
        href: `/api/chaining/post/swap/BONK-SOL`,
      },
    },
  };
  return c.json(response);
});

app.post('/BONK-SOL', async (c) => {
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
          type: 'transaction',
          href: `/api/chaining/post/swap/BONK-SOL/{${amountParameterName}}`,
          label: `Buy ${outputToken} (chain)`,
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
});

app.post('/BONK-SOL/:amount', async (c) => {
  const amount = c.req.param('amount') ?? DEFAULT_SWAP_AMOUNT_USD.toString();
  const { account } = (await c.req.json()) as ActionPostRequest;
  const inputToken = 'BONK';
  const outputToken = 'SOL';

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
  const response: ActionPostResponse = {
    type: 'transaction',
    transaction: swapResponse.swapTransaction,
  };
  return c.json(response);
});

export default app;
