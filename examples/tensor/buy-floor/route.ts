import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ActionError, ActionGetResponse, ActionPostRequest, ActionPostResponse } from '@solana/actions';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { findCollectionBySlug, getListingsByCollection } from '../../../api/tensor-api';
import { createBuyNftTransaction } from './transaction-utils';
import { formatTokenAmount } from '../../../shared/number-formatting-utils';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../../openapi';

const app = new OpenAPIHono();

app.openapi(createRoute({
  method: 'get',
  path: '/{collectionSlug}',
  tags: ['Tensor Buy Floor'],
  request: {
    params: z.object({
      collectionSlug: z.string().openapi({
        param: {
          name: 'collectionSlug',
          in: 'path',
        },
        type: 'string',
        example: 'madlads',
      }),
    }),
  },
  responses: actionsSpecOpenApiGetResponse,
}), async (c) => {
  const collectionSlug = c.req.param('collectionSlug');
  const collection = await findCollectionBySlug(collectionSlug);
  if (!collection) {
    return c.json(
      {
        message: `Collection ${collectionSlug} not found`,
      } satisfies ActionError,
      {
        status: 422,
      },
    );
  }
  const buyNowPriceNetFees = collection.stats.buyNowPriceNetFees;
  if (!buyNowPriceNetFees) {
    return c.json(
      {
        icon: collection.imageUri,
        label: `Not Available`,
        title: `Buy Floor ${collection.name}`,
        description: collection.description,
        disabled: true,
        error: {
          message: `Collection has no listed NFTs`,
        },
      } satisfies ActionGetResponse,
      {
        status: 200,
      },
    );
  }
  const uiPrice = formatTokenAmount(
    parseInt(buyNowPriceNetFees) / LAMPORTS_PER_SOL,
  );
  return c.json(
    {
      icon: collection.imageUri,
      label: `${uiPrice} SOL`,
      title: `Buy Floor ${collection.name}`,
      description: collection.description,
    } satisfies ActionGetResponse,
  );
});

app.openapi(createRoute({
  method: 'post',
  path: '/{collectionSlug}',
  tags: ['Tensor Buy Floor'],
  request: {
    params: z.object({
      collectionSlug: z.string().openapi({
        param: {
          name: 'collectionSlug',
          in: 'path',
        },
        type: 'string',
        example: 'madlads',
      }),
    }),
    body: actionSpecOpenApiPostRequestBody,
  },
  responses: actionsSpecOpenApiPostResponse,
}), async (c) => {
  const collectionSlug = c.req.param('collectionSlug');

  try {
    const { account } = (await c.req.json()) as ActionPostRequest;
    const collection = await findCollectionBySlug(collectionSlug);
    if (!collection) {
      return c.json(
        {
          message: `Collection ${collectionSlug} not found`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }
    const floorMint = (await getListingsByCollection(collection.collId))
      .mints[0];
    if (!floorMint || !collection.stats.buyNowPriceNetFees) {
      return c.json(
        {
          message: `Collection has no listed NFTs`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    const transaction = await createBuyNftTransaction(floorMint, account);

    if (!transaction) {
      throw new Error('Failed to create transaction');
    }

    const response: ActionPostResponse = {
      transaction: transaction,
    };

    return c.json(response);
  } catch (e) {
    console.error(
      `Failed to prepare buy floor transaction for ${collectionSlug}`,
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
});

export default app;
