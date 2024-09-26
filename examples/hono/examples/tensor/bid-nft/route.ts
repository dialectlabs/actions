import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from '@solana/actions';
import { findCollectionBySlug, getNftInfo } from '../../../api/tensor-api';
import { formatTokenAmount } from '../../../shared/number-formatting-utils';
import {
  createBidNftTransaction,
  createBuyNftTransaction,
} from './transaction-utils';
import { Hono } from 'hono';

const app = new Hono();

app.get('/:nftMint', async (c) => {
    const nftMint = c.req.param('nftMint');

    const nftInfo = await getNftInfo(nftMint);

    if (!nftInfo) {
      return c.json(
        {
          message: `NFT ${nftMint} not found`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    const { slug, name, imageUri, listing, slugDisplay } = nftInfo;

    const title = `${name}`;

    const collection = await findCollectionBySlug(slugDisplay);

    if (!collection) {
      throw new Error(`Collection ${slug} not found`);
    }

    const actions: any[] = [
      {
        href: `/api/tensor/bid-nft/${nftMint}/{amount}`,
        label: 'Make Offer',
        parameters: [
          {
            name: 'amount',
            label: 'Enter a custom SOL amount',
          },
        ],
      },
    ];

    if (listing.price) {
      const uiPrice = formatTokenAmount(
        parseInt(listing.price) / LAMPORTS_PER_SOL,
      );

      actions.unshift({
        href: `/api/tensor/bid-nft/${nftMint}`,
        label: `Buy Now (${uiPrice} SOL)`,
      });
    }

    const response: ActionGetResponse = {
      icon: imageUri,
      label: 'Tensor Trade',
      title,
      description: collection.description,
      links: {
        actions,
      },
    };

    return c.json(response, 200);
  },
);

app.get('/:nftMint/:amount', async (c) => {
    const amount = c.req.param('amount');
    const nftMint = c.req.param('nftMint');
    const nftInfo = await getNftInfo(nftMint);

    if (!nftInfo) {
      return c.json(
        {
          message: `NFT ${nftMint} not found`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    const { slug, name, imageUri, listing, slugDisplay } = nftInfo;

    const title = `${name}`;

    const collection = await findCollectionBySlug(slugDisplay);

    if (!collection) {
      throw new Error(`Collection ${slug} not found`);
    }

    const response: ActionGetResponse = {
      icon: imageUri,
      label: `${amount} SOL`,
      title,
      description: collection.description,
    };
    return c.json(response, 200);
  },
);

app.post('/:nftMint/:amount', async (c) => {
    const nftMint = c.req.param('nftMint');
    const rawAmount = c.req.param('amount'); // something like 1.35 SOL

    try {
      const { account } = (await c.req.json()) as ActionPostRequest;

      const nftInfo = await getNftInfo(nftMint);

      if (!nftInfo) {
        return c.json(
          {
            message: `NFT ${nftMint} not found`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }

      if (!nftInfo.listing) {
        return c.json(
          {
            message: `NFT ${nftMint} is not listed`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }

      const collection = await findCollectionBySlug(nftInfo.slugDisplay);

      if (!collection) {
        throw new Error(`Collection ${nftInfo.slugDisplay} not found`);
      }

      const amount = parseFloat(rawAmount) * LAMPORTS_PER_SOL;
      const transaction = await createBidNftTransaction(
        nftMint,
        account,
        amount,
        collection.sellRoyaltyFeeBPS,
      );

      if (!transaction) {
        throw new Error('Failed to create transaction');
      }

      const response: ActionPostResponse = {
        transaction: transaction,
      };

      return c.json(response);
    } catch (e) {
      console.error(`Failed to prepare bid transaction for ${nftMint}`, e);
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

app.post('/:nftMint', async (c) => {
    const nftMint = c.req.param('nftMint');

    try {
      const { account } = (await c.req.json()) as ActionPostRequest;

      const nftInfo = await getNftInfo(nftMint);

      if (!nftInfo) {
        return c.json(
          {
            message: `NFT ${nftMint} not found`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }

      if (!nftInfo.listing) {
        return c.json(
          {
            message: `NFT ${nftMint} is not listed`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }

      const collection = await findCollectionBySlug(nftInfo.slugDisplay);

      if (!collection) {
        throw new Error(`Collection ${nftInfo.slugDisplay} not found`);
      }

      const transaction = await createBuyNftTransaction(
        nftMint,
        account,
        nftInfo.listing.seller,
        collection.sellRoyaltyFeeBPS,
        nftInfo.listing.price,
      );

      if (!transaction) {
        throw new Error('Failed to create transaction');
      }

      const response: ActionPostResponse = {
        transaction: transaction,
      };

      return c.json(response);
    } catch (e) {
      console.error(`Failed to prepare buy transaction for ${nftMint}`, e);
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
