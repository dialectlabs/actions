import { LST, LstList } from 'sanctum-lst-list';
import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from '@solana/actions';
import jupiterApi from '../../../api/jupiter-api';
import { Hono } from 'hono';

const HELIUS_ACTION_ICON =
  'https://ucarecdn.com/bb8f075a-5e6e-4b5b-ba90-8140c020e3e2/-/preview/880x880/-/quality/smart/-/format/auto/';
const SWAP_AMOUNT_SOL_OPTIONS = [1, 5, 10];
const DEFAULT_SWAP_AMOUNT_SOL = 1;

const app = new Hono();

app.get('/', (c) => {
    const [inputToken, outputToken] = ['SOL', 'hSOL'];
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

    const amountParameterName = 'amount';
    const response: ActionGetResponse = {
      icon: HELIUS_ACTION_ICON,
      label: `Buy ${outputTokenMeta.symbol}`,
      title: `Buy ${outputTokenMeta.symbol}`,
      description: `The LST of Helius, the leading developer platform on Solana`,
      links: {
        actions: [
          ...SWAP_AMOUNT_SOL_OPTIONS.map((amount) => ({
            label: `${amount} SOL`,
            href: `/api/helius/stake/${amount}`,
          })),
          {
            href: `/api/helius/stake/{${amountParameterName}}`,
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

app.get('/:amount', (c) => {
    const [inputToken, outputToken] = ['SOL', 'hSOL'];
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

    const response: ActionGetResponse = {
      icon: HELIUS_ACTION_ICON,
      label: `Buy ${outputTokenMeta.symbol}`,
      title: `Buy ${outputTokenMeta.symbol}`,
      description: `The LST of Helius, the leading developer platform on Solana`,
    };

    return c.json(response);
  },
);

app.post('/:amount?', async (c) => {
    try {
      const amount =
        c.req.param('amount') ?? DEFAULT_SWAP_AMOUNT_SOL.toString();
      const { account } = (await c.req.json()) as ActionPostRequest;

      const [inputToken, outputToken] = ['SOL', 'hSOL'];
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
            message: `Token metadata not found.`,
          } satisfies ActionError,
          {
            status: 422,
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
      console.error(`Failed to prepare swap tx for hSOL stale`, e);
      return c.json(
        {
          message: `Failed to prepare transaction`,
        } as ActionPostResponse,
        {
          status: 500,
        },
      );
    }
  },
);

export default app;
