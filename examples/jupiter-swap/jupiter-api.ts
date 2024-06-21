import {
  createJupiterApiClient,
  QuoteGetRequest,
  SwapPostRequest,
} from '@jup-ag/api';

export interface JupiterTokenPriceData {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

interface JupiterPriceApiResponse {
  data: Record<string, JupiterTokenPriceData>;
  timeTaken: number;
}

export interface JupiterTokenMetadata {
  address: string;
  chainId: number;
  decimals: number;
  name?: string;
  symbol?: string;
  logoURI: string;
  tags: string[];
}

export const createJupiterApi = () => {
  const jupiterApi = createJupiterApiClient();

  const getTokenPricesInUsdc = async (tokenIds: string[]) => {
    if (tokenIds.length === 0) {
      return {};
    }
    const url = `https://price.jup.ag/v4/price?ids=${tokenIds.join(
      ',',
    )}&vsToken=USDC`;
    const response = await fetch(url);
    const parsedResponse = (await response.json()) as JupiterPriceApiResponse;
    return parsedResponse.data;
  };

  const getTokenPriceInSol = async (tokenIds: string[]) => {
    if (tokenIds.length === 0) {
      return {};
    }
    const url = `https://price.jup.ag/v4/price?ids=${tokenIds.join(
      ',',
    )}&vsToken=SOL`;
    const response = await fetch(url);
    const parsedResponse = (await response.json()) as JupiterPriceApiResponse;
    return parsedResponse.data;
  };

  const quoteGet = async (request: QuoteGetRequest) => {
    return await jupiterApi.quoteGet(request);
  };

  const swapPost = async (request: SwapPostRequest) => {
    return await jupiterApi.swapPost(request);
  };

  const getTokenList = async (): Promise<JupiterTokenMetadata[]> => {
    try {
      const response = await fetch('https://token.jup.ag/all');

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const getStrictList = async (): Promise<JupiterTokenMetadata[]> => {
    try {
      const response = await fetch('https://token.jup.ag/strict');

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const lookupToken = async (
    token: string | null,
  ): Promise<JupiterTokenMetadata | null> => {
    if (!token) {
      return null;
    }
    const tokenLowercase = token.toLowerCase().trim();
    const jupiterTokenMetadata = await getStrictList();

    const jupTokenMetaDatum = jupiterTokenMetadata.find(
      (token) =>
        token.symbol?.toLowerCase() === tokenLowercase ||
        token.address?.toLowerCase() === tokenLowercase,
    );

    return jupTokenMetaDatum ?? null;
  };

  return {
    getTokenPricesInUsdc,
    getTokenPriceInSol,
    quoteGet,
    swapPost,
    lookupToken,
  };
};

const jupiterApi = createJupiterApi();

export default jupiterApi;
