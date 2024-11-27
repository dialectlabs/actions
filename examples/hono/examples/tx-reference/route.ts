import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import { prepareTransaction } from '../../shared/transaction-utils';
import { Action, ActionPostRequest } from '@solana/actions';
import { Hono } from 'hono';
import { DialectTransactionResponse } from '../../shared/actions-sdk/action-spec-types';
import { TransactionResponse } from '@solana/actions-spec';

const DONATION_DESTINATION_WALLET =
  '3h4AtoLTh3bWwaLhdtgQtcC3a3Tokb8NJbtqR9rhp7p6';
const DEFAULT_DONATION_AMOUNT_SOL = 1;

const app = new Hono();

app.get('/', (c) => {
  const response: Action = {
    type: 'action',
    icon: 'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/',
    label: `Donate ${DEFAULT_DONATION_AMOUNT_SOL} SOL`,
    title: 'Donate to Alice',
    description:
      'Cybersecurity Enthusiast | Support my research with a donation.',
  };
  return c.json(response, 200);
});

app.post('/', async (c) => {
  const { account } = (await c.req.json()) as ActionPostRequest;
  const payer = new PublicKey(account);
  const ix = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: new PublicKey(DONATION_DESTINATION_WALLET),
    lamports: DEFAULT_DONATION_AMOUNT_SOL * LAMPORTS_PER_SOL,
  });
  const reference = Keypair.generate().publicKey; // 1. Generate unique reference
  ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false }); // 2. Include reference in tx instruction
  const transaction = await prepareTransaction([ix], payer);
  const response: TransactionResponse & {
    dialectExperimental: { reference: string };
  } = {
    type: 'transaction',
    transaction: Buffer.from(transaction.serialize()).toString('base64'),
    dialectExperimental: { reference: reference.toString() }, // 3. Include reference in response
  };
  return c.json(response, 200);
});

export default app;
