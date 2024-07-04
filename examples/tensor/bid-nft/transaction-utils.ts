import {
  getNftBuyTransaction,
  TensorNft,
  getNftBidTransaction,
} from '../../../api/tensor-api';
import { connection } from '../../../shared/connection';

const TENSOR_FEE_BPS = 150; // both for NFT and cNFT

export async function createBuyNftTransaction(
  nft: TensorNft,
  buyerAddress: string,
): Promise<string | null> {
  const blockhash = await connection
    .getLatestBlockhash({ commitment: 'max' })
    .then((res) => res.blockhash);

  const totalPrice = getTotalPrice(
    parseInt(nft.listing.price, 10),
    nft.sellRoyaltyFeeBPS,
  );
  return getNftBuyTransaction({
    mintAddress: nft.onchainId,
    ownerAddress: nft.listing.seller,
    buyerAddress: buyerAddress,
    price: totalPrice,
    latestBlockhash: blockhash,
  });
}

export async function createBidNftTransaction(
  nft: TensorNft,
  bidPlacer: string,
  price: number,
): Promise<string | null> {
  const blockhash = await connection
    .getLatestBlockhash({ commitment: 'max' })
    .then((res) => res.blockhash);

  const totalPrice = getTotalPrice(price, nft.sellRoyaltyFeeBPS);

  return getNftBidTransaction({
    mintAddress: nft.onchainId,
    ownerAddress: bidPlacer,
    price: totalPrice,
    latestBlockhash: blockhash,
  });
}

function getTotalPrice(price: number, royaltyBps: number): number {
  const royalty = (price * royaltyBps) / 10000;
  const marketPlaceFee = (price * TENSOR_FEE_BPS) / 10000;

  return price + royalty + marketPlaceFee;
}
