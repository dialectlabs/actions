import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';

export const REFERENCE_DATA = 'blink';

/**
 * Generate a reference blink instruction
 * @param ref optional existing unique reference public key to be used
 * @returns unique reference public key and instruction
 */
export function generateBlinkReferenceIx(ref?: PublicKey): {
  reference: PublicKey;
  referenceIx: TransactionInstruction;
} {
  const reference = ref ?? Keypair.generate().publicKey;
  const transactionInstruction = new TransactionInstruction({
    programId: new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'),
    keys: [{ pubkey: reference, isSigner: false, isWritable: false }],
    data: Buffer.from(REFERENCE_DATA),
  });
  return {
    reference: reference,
    referenceIx: transactionInstruction,
  };
}
