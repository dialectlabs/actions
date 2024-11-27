import type { TransactionResponse } from '@solana/actions-spec';

export interface DialectTransactionResponse extends TransactionResponse {
  dialectExperimental?: {
    reference?: string;
  };
}
