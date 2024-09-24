import { getNftBuyTransaction, Mint } from '../../../api/tensor-api';
import { connection } from '../../../shared/connection';

const SOURCE_TO_FEE_BPS = {
  TENSORSWAP: 150,
  TCOMP: 150,
  MAGICEDEN_V2: 250,
  default: 150,
};

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
    mint.listing.source,
  );
  return getNftBuyTransaction({
    mintAddress: mint.mint,
    ownerAddress: mint.listing.seller,
    buyerAddress: buyerAddress,
    price: totalPrice,
    latestBlockhash: blockhash,
  });
}

export function getTotalPrice(
  price: number,
  royaltyBps: number,
  source: keyof typeof SOURCE_TO_FEE_BPS | string,
): number {
  const MP_FEE_BPS =
    source in SOURCE_TO_FEE_BPS
      ? SOURCE_TO_FEE_BPS[source as keyof typeof SOURCE_TO_FEE_BPS]
      : SOURCE_TO_FEE_BPS['default'];
  const royalty = (price * royaltyBps) / 10000;
  const marketPlaceFee = (price * MP_FEE_BPS) / 10000;

  return price + royalty + marketPlaceFee;
}
