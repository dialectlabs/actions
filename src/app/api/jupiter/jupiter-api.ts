import { createJupiterApiClient, QuoteGetRequest, SwapPostRequest } from '@jup-ag/api';

export const jupiterLogo =
  'https://ucarecdn.com/09c80208-f27c-45dd-b716-75e1e55832c4/-/preview/1000x981/-/quality/smart/-/format/auto/';

export interface JupiterTokenPriceData {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

// Interface for the API response structure
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

// Function to get token exchange rates

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
  }

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

  return {
    getTokenPricesInUsdc,
    getTokenPriceInSol,
    quoteGet,
    swapPost,
    getTokenList,
    getStrictList,
  };
};

const jupiterApi = createJupiterApi();

export default jupiterApi;
