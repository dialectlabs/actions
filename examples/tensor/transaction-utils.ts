import {
  getNftBidTransaction,
  getNftBuyTransaction,
  Mint,
  TensorNft,
} from '../../api/tensor-api';
import { connection } from '../../shared/connection';

const TENSOR_FEE_BPS = 150; // both for NFT and cNFT

export async function createBuyNftTransaction(
  nft: TensorNft | Mint,
  buyerAddress: string,
): Promise<string | null> {
  const blockhash = await connection
    .getLatestBlockhash({ commitment: 'max' })
    .then((res) => res.blockhash);

  const totalPrice = getTotalPrice(
    parseInt(nft.listing.price, 10),
    isTensorNft(nft) ? nft.sellRoyaltyFeeBPS : nft.royaltyBps,
  );

  return getNftBuyTransaction({
    mintAddress: isTensorNft(nft) ? nft.onchainId : nft.mint,
    ownerAddress: nft.listing.seller,
    buyerAddress: buyerAddress,
    price: totalPrice,
    latestBlockhash: blockhash,
  });
}

export async function createNftBidTransaction(
  mint: TensorNft,
  buyerAddress: string,
  amount: number,
): Promise<string | null> {
  const blockhash = await connection
    .getLatestBlockhash({ commitment: 'max' })
    .then((res) => res.blockhash);

  // tensor UI takes user input as total amount, fees already included,
  // so let's do the same and not use getTotalPrice()

  return getNftBidTransaction({
    mintAddress: mint.onchainId,
    ownerAddress: buyerAddress,
    price: amount,
    latestBlockhash: blockhash,
  });
}

function getTotalPrice(price: number, royaltyBps: number): number {
  const royalty = (price * royaltyBps) / 10000;
  const marketPlaceFee = (price * TENSOR_FEE_BPS) / 10000;

  return price + royalty + marketPlaceFee;
}

function isTensorNft(item: any): item is TensorNft {
  return (
    typeof item.onchainId === 'string' &&
    typeof item.sellRoyaltyFeeBPS === 'number'
  );
}
