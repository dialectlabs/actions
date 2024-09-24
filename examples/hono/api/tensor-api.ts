const baseUrl = 'https://api.mainnet.tensordev.io/api/v1';

export interface GetNftBuyNowTxCommand {
  mintAddress: string;
  price: number;
  ownerAddress: string;
  buyerAddress: string;
  latestBlockhash: string;
}

export interface GetNftBidNowTxCommand {
  mintAddress: string;
  price: number;
  ownerAddress: string;
  latestBlockhash: string;
}

export interface TensorNft {
  onchainId: string;
  slug: string;
  owner: string;
  imageUri: string;
  royaltyBps: number;
  collName: string;
  name: string;
  listing: {
    price: string;
    txId: string;
    seller: string;
    source: string;
    blockNumber: string;
  };
  slugDisplay: string;
}

interface CollectionStats {
  buyNowPrice?: string;
  buyNowPriceNetFees?: string;
  floor24h: number;
  floor7d: number;
  marketCap: string;
  numBids: number;
  numListed: number;
  numListed24h: number;
  numListed7d: number;
  numMints: number;
  pctListed: number;
  sales1h: number;
  sales24h: number;
  sales7d: number;
  salesAll: number;
  sellNowPrice: string;
  sellNowPriceNetFees: string;
  volume1h: string;
  volume24h: string;
  volume7d: string;
  volumeAll: string;
}

interface Collection {
  name: string;
  collId: string;
  slugDisplay: string;
  symbol: string;
  description: string;
  teamId: string;
  website: string;
  twitter: string;
  imageUri: string;
  tensorVerified: boolean;
  tensorWhitelisted: boolean;
  whitelistPda: string;
  compressed: boolean;
  inscription: boolean;
  inscriptionMetaplex: boolean;
  spl20: boolean;
  stats: CollectionStats;
  createdAt: string;
  updatedAt: string;
  firstListDate: string;
  sellRoyaltyFeeBPS: number;
}

interface CollectionResponse {
  page: number;
  total: number;
  collections: Collection[];
}

interface Attribute {
  trait_type: string;
  value: string;
}

interface LastSale {
  price: string;
  priceUnit: string | null;
  txAt: number;
  txId: string;
  buyer: string;
  seller: string;
  source: string;
  blockNumber: string;
}

interface Listing {
  price: string;
  txId: string;
  seller: string;
  source: string;
  blockNumber: string;
  priceUnit: string | null;
}

export interface Mint {
  collId: string;
  mint: string;
  frozen: boolean;
  attributes: Attribute[];
  imageUri: string;
  lastSale: LastSale;
  metadataFetchedAt: number;
  metadataUri: string;
  animationUri: string | null;
  name: string;
  rarityRank: number;
  royaltyBps: number;
  tokenEdition: string | null;
  tokenStandard: string;
  hidden: boolean;
  compressed: boolean;
  verifiedCollection: string;
  updateAuthority: string;
  owner: string;
  listing: Listing;
  inscription: string | null;
  tokenProgram: string | null;
  metadataProgram: string | null;
  transferHookProgram: string | null;
}

interface Page {
  endCursor: string;
  hasMore: boolean;
}

interface ListingsResponse {
  mints: Mint[];
  page: Page;
}

const TENSOR_API_KEY = process.env.SECRET_TENSOR_API_KEY!;

export async function getNftInfo(
  mintAddress: string,
): Promise<TensorNft | null> {
  try {
    const response = await fetch(`${baseUrl}/mint?mint=${mintAddress}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-tensor-api-key': TENSOR_API_KEY,
      },
    });

    return response.json();
  } catch (e) {
    console.warn(e);
    return null;
  }
}

export async function getListingsByCollection(collId: string) {
  const response: ListingsResponse = await fetch(
    `${baseUrl}/mint/active_listings?collId=${collId}&sortBy=ListingPriceAsc&limit=1`,
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-tensor-api-key': TENSOR_API_KEY,
      },
    },
  ).then((response) => response.json());

  return response;
}

export async function getListingsByCollectionWithEncodedFilters(
  collId: string,
  encodedFilters: string,
) {
  const response: ListingsResponse = await fetch(
    `${baseUrl}/mint/active_listings?collId=${collId}&sortBy=ListingPriceAsc&encodedFilters=${encodedFilters}&limit=2`,
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-tensor-api-key': TENSOR_API_KEY,
      },
    },
  ).then((response) => response.json());

  return response;
}

//
export async function findCollectionBySlug(
  slug: string,
): Promise<Collection | null> {
  const collectionResponse: CollectionResponse = await fetch(
    `${baseUrl}/collections?sortBy=statsV2.volume1h%3Adesc&limit=1&slugDisplays=${slug}`,
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-tensor-api-key': TENSOR_API_KEY,
      },
    },
  ).then((response) => response.json());

  return collectionResponse.collections[0] ?? null;
}

export async function getNftBuyTransaction({
  mintAddress,
  ownerAddress,
  buyerAddress,
  price,
  latestBlockhash,
}: GetNftBuyNowTxCommand) {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('buyer', buyerAddress);
    queryParams.append('mint', mintAddress);
    queryParams.append('owner', ownerAddress);
    queryParams.append('maxPrice', price.toString());
    queryParams.append('blockhash', latestBlockhash);

    const fullUrl = `${baseUrl}/tx/buy?${queryParams.toString()}`;
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-tensor-api-key': TENSOR_API_KEY,
      },
    });

    const buyNftResponse = await response.json();

    return buyNftResponse.txs[0]?.txV0
      ? Buffer.from(buyNftResponse.txs[0]?.txV0.data).toString('base64')
      : null;
  } catch (e) {
    console.warn(e);
    return null;
  }
}

export async function getNftBidTransaction({
  mintAddress,
  ownerAddress,
  price,
  latestBlockhash,
}: GetNftBidNowTxCommand) {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('owner', ownerAddress);
    queryParams.append('price', price.toString());
    queryParams.append('mint', mintAddress);
    queryParams.append('blockhash', latestBlockhash);

    const fullUrl = `${baseUrl}/tx/bid?${queryParams.toString()}`;
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-tensor-api-key': TENSOR_API_KEY,
      },
    });

    const bidNftResponse = await response.json();

    return bidNftResponse.txs[0]?.txV0
      ? Buffer.from(bidNftResponse.txs[0]?.txV0.data).toString('base64')
      : null;
  } catch (e) {
    console.warn(e);
    return null;
  }
}
