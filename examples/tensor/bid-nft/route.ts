import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  LinkedAction,
} from '@solana/actions';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { findCollectionBySlug, getNftInfo } from '../../../api/tensor-api';
import { formatTokenAmount } from '../../../shared/number-formatting-utils';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../../openapi';
import {
  createBidNftTransaction,
  createBuyNftTransaction,
} from './transaction-utils';

const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: 'get',
    path: '/{mintAddress}',
    tags: ['Tensor Bid NFT'],
    request: {
      params: z.object({
        mintAddress: z.string().openapi({
          param: {
            name: 'mintAddress',
            in: 'path',
          },
          type: 'string',
          example: 'F9Lw3ki3hJ7PF9HQXsBzoY8GyE6sPoEZZdXJBsTTD2rk',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const mintAddress = c.req.param('mintAddress');

    const nft = await getNftInfo(mintAddress);
    if (!nft) {
      return c.json(
        {
          message: `NFT ${mintAddress} not found`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    const collection = await findCollectionBySlug(nft.slugDisplay);
    if (!collection) {
      return c.json(
        {
          message: `Collection ${nft.slug} not found`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    if (!nft.listing) {
      return c.json({
        icon: nft.imageUri,
        label: 'Not Available',
        title: nft.name,
        description: collection.description,
        disabled: true,
        error: {
          message: 'NFT has no listed',
        },
      } satisfies ActionGetResponse);
    }

    const uiPrice = formatTokenAmount(
      parseInt(nft.listing.price) / LAMPORTS_PER_SOL,
    );

    const amountParameterName = 'amount';
    const actions: LinkedAction[] = [
      {
        href: `/api/tensor/bid-nft/${mintAddress}`,
        label: `Buy Now (${uiPrice} SOL)`,
      },
      {
        href: `/api/tensor/bid-nft/${mintAddress}/{${amountParameterName}}`,
        label: 'Make Offer',
        parameters: [
          {
            name: amountParameterName,
            label: 'Enter a custom SOL amount',
          },
        ],
      },
    ];

    return c.json({
      icon: nft.imageUri,
      label: `Buy Now (${uiPrice} SOL)`,
      title: nft.name,
      description: collection.description,
      links: {
        actions,
      },
    } satisfies ActionGetResponse);
  },
);

app.openapi(
  createRoute({
    method: 'get',
    path: '/{mintAddress}/{amount}',
    tags: ['Tensor Bid NFT'],
    request: {
      params: z.object({
        mintAddress: z.string().openapi({
          param: {
            name: 'mintAddress',
            in: 'path',
          },
          type: 'string',
          example: 'F9Lw3ki3hJ7PF9HQXsBzoY8GyE6sPoEZZdXJBsTTD2rk',
        }),
        amount: z.string().openapi({
          param: {
            name: 'amount',
            in: 'path',
          },
          type: 'number',
          example: '1',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const mintAddress = c.req.param('mintAddress');
    const amount = c.req.param('amount');

    const nft = await getNftInfo(mintAddress);
    if (!nft) {
      return c.json(
        {
          message: `NFT ${mintAddress} not found`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    const collection = await findCollectionBySlug(nft.slugDisplay);
    if (!collection) {
      return c.json(
        {
          message: `Collection ${nft.slug} not found`,
        } satisfies ActionError,
        {
          status: 422,
        },
      );
    }

    return c.json({
      icon: nft.imageUri,
      label: `${amount} SOL)`,
      title: nft.name,
      description: collection.description,
    } satisfies ActionGetResponse);
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/{mintAddress}',
    tags: ['Tensor Bid NFT'],
    request: {
      params: z.object({
        mintAddress: z.string().openapi({
          param: {
            name: 'mintAddress',
            in: 'path',
          },
          type: 'string',
          example: 'F9Lw3ki3hJ7PF9HQXsBzoY8GyE6sPoEZZdXJBsTTD2rk',
        }),
      }),
      body: actionSpecOpenApiPostRequestBody,
    },
    responses: actionsSpecOpenApiPostResponse,
  }),
  async (c) => {
    const mintAddress = c.req.param('mintAddress');

    try {
      const { account } = (await c.req.json()) as ActionPostRequest;

      const nft = await getNftInfo(mintAddress);
      if (!nft) {
        return c.json(
          {
            message: `NFT ${mintAddress} not found`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }

      const collection = await findCollectionBySlug(nft.slugDisplay);
      if (!collection) {
        return c.json(
          {
            message: `Collection ${nft.slug} not found`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }

      if (!nft.listing) {
        return c.json({
          icon: nft.imageUri,
          label: 'Not Available',
          title: nft.name,
          description: collection.description,
          disabled: true,
          error: {
            message: 'NFT has no listed',
          },
        } satisfies ActionGetResponse);
      }

      const transaction = await createBuyNftTransaction(nft, account);
      if (!transaction) {
        throw new Error('Failed to create transaction');
      }

      return c.json({ transaction } satisfies ActionPostResponse);
    } catch (e) {
      console.error(`Failed to prepare transaction for ${mintAddress}`, e);

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

app.openapi(
  createRoute({
    method: 'post',
    path: '/{mintAddress}/{amount}',
    tags: ['Tensor Bid NFT'],
    request: {
      params: z.object({
        mintAddress: z.string().openapi({
          param: {
            name: 'mintAddress',
            in: 'path',
          },
          type: 'string',
          example: 'F9Lw3ki3hJ7PF9HQXsBzoY8GyE6sPoEZZdXJBsTTD2rk',
        }),
        amount: z.string().openapi({
          param: {
            name: 'amount',
            in: 'path',
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
    const mintAddress = c.req.param('mintAddress');
    const amount = c.req.param('amount');

    try {
      const { account } = (await c.req.json()) as ActionPostRequest;

      const nft = await getNftInfo(mintAddress);
      if (!nft) {
        return c.json(
          {
            message: `NFT ${mintAddress} not found`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }

      const collection = await findCollectionBySlug(nft.slugDisplay);
      if (!collection) {
        return c.json(
          {
            message: `Collection ${nft.slug} not found`,
          } satisfies ActionError,
          {
            status: 422,
          },
        );
      }

      if (!nft.listing) {
        return c.json({
          icon: nft.imageUri,
          label: 'Not Available',
          title: nft.name,
          description: collection.description,
          disabled: true,
          error: {
            message: 'NFT has no listed',
          },
        } satisfies ActionGetResponse);
      }

      const transaction = await createBidNftTransaction(
        nft,
        account,
        parseFloat(amount) * LAMPORTS_PER_SOL,
      );
      if (!transaction) {
        throw new Error('Failed to create transaction');
      }

      return c.json({ transaction } satisfies ActionPostResponse);
    } catch (e) {
      console.error(`Failed to prepare transaction for ${mintAddress}`, e);

      return c.json(
        {
          message: `Failed to prepare transaction`,
        } satisfies ActionError,
        {
          status: 500,
        },
      );
    }
    return c.json({});
  },
);

export default app;
