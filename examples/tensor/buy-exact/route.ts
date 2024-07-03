import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  LinkedAction,
} from '@solana/actions';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getNftInfo } from '../../../api/tensor-api';
import { formatTokenAmount } from '../../../shared/number-formatting-utils';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../../openapi';
import {
  createBuyNftTransaction,
  createNftBidTransaction,
} from '../transaction-utils';

const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: 'get',
    path: '/{mint}',
    tags: ['Tensor Exact NFT'],
    request: {
      params: z.object({
        mint: z.string().openapi({
          param: {
            name: 'mint',
            in: 'path',
          },
          type: 'string',
          example: 'H59L9m1AY6L3wJDRC4V2hzim5jafQ5L7e2kmxv8d5SGY',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const mint = c.req.param('mint');
    const nft = await getNftInfo(mint);
    if (!nft) {
      return c.json(
        {
          message: `Mint ${mint} not found`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    const offerAction: LinkedAction = {
      href: `/api/tensor/buy-exact/${mint}?amount={amount}`,
      label: 'Place Offer',
      parameters: [
        {
          name: 'amount',
          label: 'Your offer in SOL (all fees included)',
        },
      ],
    };

    let title = `Place Offer`;
    let description = `${nft.name} of ${nft.collName} is currently not listed 😕, but you can place an offer 😯.`;
    const actions = new Array(offerAction) as LinkedAction[];

    if (nft.listing && nft.listing.price) {
      const uiPrice = formatTokenAmount(
        parseInt(nft.listing.price) / LAMPORTS_PER_SOL,
      );
      const buyAction: LinkedAction = {
        href: `/api/tensor/buy-exact/${mint}?amount=`,
        label: `Buy Now for ${uiPrice} SOL`,
      };

      title = `Buy Now`;
      description = `${nft.name} of ${nft.collName} is listed 🥳. Buy now for ${uiPrice} SOL (plus fees) or place an offer 🤓.`;
      actions.unshift(buyAction);
    }

    return c.json(
      {
        icon: nft.imageUri,
        title: title,
        description: description,
        label: `We have actions :)`,
        links: {
          actions,
        },
      } satisfies ActionGetResponse,
      {
        status: 200,
      },
    );
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/{mint}',
    tags: ['Tensor Exact NFT'],
    request: {
      params: z.object({
        mint: z.string().openapi({
          param: {
            name: 'mint',
            in: 'path',
          },
          type: 'string',
          example: 'H59L9m1AY6L3wJDRC4V2hzim5jafQ5L7e2kmxv8d5SGY',
        }),
      }),
      // TODO: there seems to be a bug that query params cannot be marked as
      // optional which is why we currently pass it as "?amount=" for buy actions.
      // this can be cleaned up once optional query params are working in hono.
      // remember to also change the href in the action link above.
      query: z.object({
        amount: z.string().openapi({
          param: {
            name: 'amount',
            in: 'query',
            required: false,
            allowEmptyValue: true,
          },
          required: [],
          type: 'number',
          example: '0.1',
        }),
      }),
      body: actionSpecOpenApiPostRequestBody,
    },
    responses: actionsSpecOpenApiPostResponse,
  }),
  async (c) => {
    const mintAdress = c.req.param('mint');
    const amountParam = c.req.query('amount');

    try {
      const { account } = (await c.req.json()) as ActionPostRequest;

      const nft = await getNftInfo(mintAdress);
      if (!nft) {
        return c.json(
          {
            message: `Mint ${mintAdress} not found`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }

      let transaction;
      if (amountParam) {
        const amount = parseFloat(amountParam);
        if (amount && amount > 0) {
          // TODO: we could also check that the amount is
          // at least half collection floor like tensor UI does
          transaction = await createNftBidTransaction(
            nft,
            account,
            amount * LAMPORTS_PER_SOL,
          );
        } else {
          return c.json(
            {
              message: `Given amount ${amountParam} is not a valid bid amount.`,
            } satisfies ActionError,
            {
              status: 400,
            },
          );
        }
      } else {
        if (nft.listing && nft.listing.price) {
          transaction = await createBuyNftTransaction(nft, account);
        } else {
          return c.json(
            {
              message: `Cannot buy nft ${mintAdress} because it is not listed (anymore).`,
            } satisfies ActionError,
            {
              status: 400,
            },
          );
        }
      }

      if (!transaction) {
        throw new Error('Failed to create transaction');
      }

      const response: ActionPostResponse = {
        transaction: transaction,
      };

      return c.json(response);
    } catch (e) {
      console.error(
        `Failed to prepare buy or bid on NFT transaction for ${mintAdress} and amount ${amountParam}`,
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
