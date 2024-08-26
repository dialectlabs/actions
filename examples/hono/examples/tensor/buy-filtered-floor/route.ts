import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ActionError, ActionGetResponse, ActionPostRequest, ActionPostResponse } from '@solana/actions';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { findCollectionBySlug, getListingsByCollectionWithEncodedFilters } from '../../../api/tensor-api';
import { buildFilterInfo, extractFiltersFromEncodedFilters } from './utils';
import { formatTokenAmount } from '../../../shared/number-formatting-utils';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../../openapi';
import { createBuyNftTransaction, getTotalPrice } from '../buy-floor/transaction-utils';

const app = new OpenAPIHono();

app.openapi(createRoute({
  method: 'get',
  path: '/{collectionSlug}/{encodedFilters}',
  tags: ['Tensor Buy Filtered Floor'],
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
      encodedFilters: z.string().openapi({
        param: {
          name: 'encodedFilters',
          in: 'path',
        },
        type: 'string',
        example: 'eyJ0cmFpdHNGaWx0ZXIiOnsiQmFjayI6WyJZZWxsb3cgS2F0YW5hIl19fQ%3D%3D',
      }),
    }),
  },
  responses: actionsSpecOpenApiGetResponse,
}), async (c) => {
  const encodedFilters = c.req.param('encodedFilters')!;
  const collectionSlug = c.req.param('collectionSlug');
  const filters = extractFiltersFromEncodedFilters(encodedFilters);
  if(!filters){
    return c.json(
      {
        message: `Incorrect encodedFilters (needs to be base64 encoded!)`,
      } satisfies ActionError,
      {
        status: 422,
      },
    );
  }
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
  const lowestListings = await getListingsByCollectionWithEncodedFilters(collection.collId, encodedFilters);
  if(!lowestListings || !lowestListings.mints || lowestListings.mints.length < 1)
    return c.json(
      {
        icon: collection.imageUri,
        label: `Not Available`,
        title: `Buy Filtered Floor ${collection.name}`,
        description: collection.description,
        disabled: true,
        error: {
          message: `No listings available`,
        },
      } satisfies ActionGetResponse,
      {
        status: 200,
      },
    );
  // If the 2 lowest assets are equal (same name + imageURI) we'll format the Blink differently
  const hasEqualFloorAssets = lowestListings.mints.length > 1 
    ? lowestListings.mints[0].name == lowestListings.mints[1].name && lowestListings.mints[0].imageUri == lowestListings.mints[1].imageUri 
    : false;
  const lowestListing = lowestListings.mints[0]
  const buyNowPriceNetFees = getTotalPrice(
      parseInt(lowestListing.listing.price), 
      collection.sellRoyaltyFeeBPS,
      lowestListing.listing.source
    );
  const uiPrice = formatTokenAmount(
    buyNowPriceNetFees / LAMPORTS_PER_SOL,
  );
  // If equal floor assets, we don't want to display the trait filter
  const filterInfo = buildFilterInfo(filters, hasEqualFloorAssets);
  return hasEqualFloorAssets
    ? c.json(
      {
        icon: lowestListing.imageUri,
        label: `${uiPrice} SOL`,
        title: `Buy the floor of ${lowestListing.name}`,
        description: `${collection.name} - ${collection.description}` + (filterInfo.length > 0 ? `\n\nAdditional Filters:\n${filterInfo}` : ``),
      } satisfies ActionGetResponse,
    )
    : c.json(
      {
        icon: lowestListing.imageUri,
        label: `${uiPrice} SOL`,
        title: `Buy a filtered floor ${collection.name}`,
        description: `${collection.description}\n\nFilters:\n${filterInfo}`,
      } satisfies ActionGetResponse,
    );
  });

app.openapi(createRoute({
  method: 'post',
  path: '/{collectionSlug}/{encodedFilters}',
  tags: ['Tensor Buy Filtered Floor'],
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
      encodedFilters: z.string().openapi({
        param: {
          name: 'encodedFilters',
          in: 'path',
        },
        type: 'string',
        example: 'eyJ0cmFpdHNGaWx0ZXIiOnsiQmFjayI6WyJZZWxsb3cgS2F0YW5hIl19fQ%3D%3D',
      }),
    }),
    body: actionSpecOpenApiPostRequestBody,
  },
  responses: actionsSpecOpenApiPostResponse,
}), async (c) => {
  const collectionSlug = c.req.param('collectionSlug');
  const encodedFilters = c.req.param('encodedFilters')!;

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
    const floorMint = (await getListingsByCollectionWithEncodedFilters(collection.collId, encodedFilters))
      .mints[0];
    if (!floorMint) {
      return c.json(
        {
          message: `No listed NFTs for that collection - filter combination`,
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
      `Failed to prepare filtered buy floor transaction for ${collectionSlug} and filter ${encodedFilters}`,
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
