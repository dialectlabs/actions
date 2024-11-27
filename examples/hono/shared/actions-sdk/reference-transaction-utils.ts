import {
  AddressLookupTableAccount,
  Connection,
  TransactionInstruction,
  TransactionMessage,
  VersionedMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { generateBlinkReferenceIx } from './reference-instruction-utils';

export async function addReferenceIx(
  transaction: VersionedTransaction,
  connection: Connection,
) {
  try {
    const { reference, referenceIx } = generateBlinkReferenceIx();
    transaction.message = await addTxInstructions(
      [referenceIx],
      transaction.message,
      connection,
    );
    return {
      reference: reference,
      transaction,
    };
  } catch (e) {
    console.error('failed to add reference instruction to transaction', e);
    return {
      reference: null,
      transaction,
    };
  }
}

async function addTxInstructions(
  ixs: TransactionInstruction[],
  message: VersionedMessage,
  connection: Connection,
) {
  const addressLookupTableAccounts = await Promise.all(
    message.addressTableLookups.map(async (lookup) => {
      return new AddressLookupTableAccount({
        key: lookup.accountKey,
        state: AddressLookupTableAccount.deserialize(
          await connection
            .getAccountInfo(lookup.accountKey)
            .then((res) => res!.data),
        ),
      });
    }),
  );

  const decompiledMessage = TransactionMessage.decompile(message, {
    addressLookupTableAccounts: addressLookupTableAccounts,
  });
  decompiledMessage.instructions.push(...ixs);
  return decompiledMessage.compileToV0Message(addressLookupTableAccounts);
}
