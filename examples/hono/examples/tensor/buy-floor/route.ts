import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from '@solana/actions';
import {
  findCollectionBySlug,
  getListingsByCollection,
} from '../../../api/tensor-api';
import { createBuyNftTransaction, getTotalPrice } from './transaction-utils';
import { formatTokenAmount } from '../../../shared/number-formatting-utils';
import { Hono } from 'hono';

const app = new Hono();

app.get('/:collectionSlug', async (c) => {
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
    const buyNowPriceNetFees = collection.stats.buyNowPriceNetFees
      ? parseInt(collection.stats.buyNowPriceNetFees)
      : await getListingsByCollection(collection.collId).then((resp) =>
          getTotalPrice(
            parseInt(resp.mints[0].listing.price),
            collection.sellRoyaltyFeeBPS,
            resp.mints[0].listing.source,
          ),
        );
    const numListed = collection.stats.numListed;
    if (numListed < 1) {
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
    const uiPrice = formatTokenAmount(buyNowPriceNetFees / LAMPORTS_PER_SOL);
    return c.json({
      icon: collection.imageUri,
      label: `${uiPrice} SOL`,
      title: `Buy Floor ${collection.name}`,
      description: collection.description,
    } satisfies ActionGetResponse);
  },
);

app.post('/:collectionSlug', async (c) => {
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
      if (!floorMint) {
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
  },
);

export default app;
