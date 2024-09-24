import {
  getNftBuyTransaction,
  getNftBidTransaction,
} from '../../../api/tensor-api';
import { connection } from '../../../shared/connection';

const TENSOR_FEE_BPS = 150; // both for NFT and cNFT

export async function createBidNftTransaction(
  mintAddress: string,
  ownerAddress: string,
  price: number,
  royaltyBps: number,
): Promise<string | null> {
  const blockhash = await connection
    .getLatestBlockhash({ commitment: 'max' })
    .then((res) => res.blockhash);

  const totalPrice = getTotalPrice(price, royaltyBps);
  return getNftBidTransaction({
    mintAddress: mintAddress,
    ownerAddress: ownerAddress,
    price: totalPrice,
    latestBlockhash: blockhash,
  });
}

export async function createBuyNftTransaction(
  mint: string,
  buyerAddress: string,
  ownerAddress: string,
  royaltyBps: number,
  price: string,
): Promise<string | null> {
  const blockhash = await connection
    .getLatestBlockhash({ commitment: 'max' })
    .then((res) => res.blockhash);

  const totalPrice = getTotalPrice(parseInt(price, 10), royaltyBps);
  return getNftBuyTransaction({
    mintAddress: mint,
    ownerAddress: ownerAddress,
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
