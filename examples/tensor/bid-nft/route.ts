import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ActionError, ActionGetResponse, ActionPostRequest, ActionPostResponse } from '@solana/actions';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getNftInfo } from '../../../api/tensor-api';
import { formatTokenAmount } from '../../../shared/number-formatting-utils';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../../openapi';
import { createBidNftTransaction, createBuyNftTransaction } from './transaction-utils';

const app = new OpenAPIHono();

app.openapi(createRoute({
  method: 'get',
  path: '/{nftMint}',
  tags: ['Tensor Bid NFT'],
  request: {
    params: z.object({
      nftMint: z.string().openapi({
        param: {
          name: 'nftMint',
          in: 'path',
        },
        type: 'string',
        example: 'DL4pWLrfh2wXiovZLtbjeXDYMoo6zoa7wFCVJX8qUpxw',
      }),
    }),
  },
  responses: actionsSpecOpenApiGetResponse,
}), async (c) => {
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

  const {
    slug,
    name,
    imageUri,
    listing,
  } = nftInfo;

  const title = `${slug} #${name}`;

  const actions: any[] = [{
    href: `/${nftMint}/{amount}`,
    label: 'Make Offer',
    parameters: [
      {
        name: 'amount',
        label: 'Enter a custom SOL amount',
      },
    ],
  }];

  if (listing) {
    const uiPrice = formatTokenAmount(
      parseInt(listing.price) / LAMPORTS_PER_SOL,
    );

    actions.unshift({
      href: `/${nftMint}`,
      label: `Buy Now (${uiPrice} SOL)`,
    });
  }

  const response: ActionGetResponse = {
    icon: imageUri,
    label: 'Tensor Trade',
    title,
    description: 'Fock it',
    links: {
      actions,
    },
  };

  return c.json(response, 200);
});

app.openapi(createRoute({
    method: 'get',
    path: '/{nftMint}/{amount}',
    tags: ['Tensor Bid NFT'],
    request: {
      params: z.object({
        nftMint: z.string().openapi({
          param: {
            name: 'nftMint',
            in: 'path',
          },
          type: 'string',
          example: 'DL4pWLrfh2wXiovZLtbjeXDYMoo6zoa7wFCVJX8qUpxw',
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

    const {
      slug,
      name,
      imageUri,
    } = nftInfo;
  
    const title = `${slug} #${name}`;

    const response: ActionGetResponse = {
      icon: imageUri,
      label: `${amount} SOL`,
      title,
      description: 'Fock it',
    };
    return c.json(response, 200);
  },
);

app.openapi(createRoute({
  method: 'post',
  path: '/{nftMint}/{amount}',
  tags: ['Tensor Bid NFT'],
  request: {
    params: z.object({
      nftMint: z.string().openapi({
        param: {
          name: 'nftMint',
          in: 'path',
        },
        type: 'string',
        example: 'DL4pWLrfh2wXiovZLtbjeXDYMoo6zoa7wFCVJX8qUpxw',
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
}), async (c) => {
  const nftMint = c.req.param('nftMint');
  const amount = c.req.param('amount');

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

    const transaction = await createBidNftTransaction(nftMint, account, amount, nftInfo.royaltyBps);

    if (!transaction) {
      throw new Error('Failed to create transaction');
    }

    const response: ActionPostResponse = {
      transaction: transaction,
    };

    return c.json(response);
  } catch (e) {
    console.error(
      `Failed to prepare bid transaction for ${nftMint}`,
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

app.openapi(createRoute({
  method: 'post',
  path: '/{nftMint}',
  tags: ['Tensor Bid NFT'],
  request: {
    params: z.object({
      nftMint: z.string().openapi({
        param: {
          name: 'nftMint',
          in: 'path',
        },
        type: 'string',
        example: 'DL4pWLrfh2wXiovZLtbjeXDYMoo6zoa7wFCVJX8qUpxw',
      }),
    }),
    body: actionSpecOpenApiPostRequestBody,
  },
  responses: actionsSpecOpenApiPostResponse,
}), async (c) => {
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

    const transaction = await createBuyNftTransaction(nftMint, account, nftInfo.listing.seller, nftInfo.royaltyBps, nftInfo.listing.price);

    if (!transaction) {
      throw new Error('Failed to create transaction');
    }

    const response: ActionPostResponse = {
      transaction: transaction,
    };

    return c.json(response);
  } catch (e) {
    console.error(
      `Failed to prepare buy transaction for ${nftMint}`,
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
