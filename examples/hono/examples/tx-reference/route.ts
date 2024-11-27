import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';
import { prepareTransaction } from '../../shared/transaction-utils';
import { Action, ActionPostRequest } from '@solana/actions';
import { Hono } from 'hono';
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
  const transaction = await prepareTransaction([ix], payer);
  const response: TransactionResponse = {
    type: 'transaction',
    transaction: Buffer.from(transaction.serialize()).toString('base64'),
  };
  return c.json(response, 200);
});

export default app;
