import { getNftBuyTransaction, Mint } from '../../../api/tensor-api';
import { connection } from '../../../shared/connection';

const TENSOR_FEE_BPS = 150; // both for NFT and cNFT

export async function createBuyNftTransaction(
  mint: Mint,
  buyerAddress: string,
): Promise<string | null> {
  const blockhash = await connection
    .getLatestBlockhash({ commitment: 'max' })
    .then((res) => res.blockhash);

  const totalPrice = getTotalPrice(
    parseInt(mint.listing.price, 10),
    mint.royaltyBps,
  );
  return getNftBuyTransaction({
    mintAddress: mint.mint,
    ownerAddress: mint.listing.seller,
    buyerAddress: buyerAddress,
    price: totalPrice,
    latestBlockhash: blockhash,
  });
}

function getTotalPrice(price: number, royaltyBps: number): number {
  const royalty = (price * royaltyBps) / 10000;
  const marketPlaceFee = (price * TENSOR_FEE_BPS) / 10000;

  return price + royalty + marketPlaceFee;
}
