import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from '@solana/web3.js';
import { prepareTransaction } from '../../shared/transaction-utils';
import { Action, ActionPostRequest, LinkedAction } from '@solana/actions';
import { Hono } from 'hono';
import { DialectTransactionResponse } from '../../shared/actions-sdk/action-spec-types';
import { generateBlinkReferenceIx } from '../../shared/actions-sdk/reference-instruction-utils';

const DONATION_DESTINATION_WALLET =
  '3h4AtoLTh3bWwaLhdtgQtcC3a3Tokb8NJbtqR9rhp7p6';
const DONATION_AMOUNT_SOL_OPTIONS = [1, 5, 10];
const DEFAULT_DONATION_AMOUNT_SOL = 1;

const app = new Hono();

app.get('/', (c) => {
  const { icon, title, description } = getDonateInfo();
  const amountParameterName = 'amount';
  const response: Action = {
    type: 'action',
    icon,
    label: `${DEFAULT_DONATION_AMOUNT_SOL} SOL`,
    title,
    description,
    links: {
      actions: [
        ...DONATION_AMOUNT_SOL_OPTIONS.map(
          (amount) =>
            ({
              type: 'transaction',
              label: `${amount} SOL`,
              href: `/api/tx-reference/${amount}`,
            }) satisfies LinkedAction,
        ),
        {
          type: 'transaction',
          href: `/api/tx-reference/{${amountParameterName}}`,
          label: 'Donate',
          parameters: [
            {
              name: amountParameterName,
              label: 'Enter a custom SOL amount',
            },
          ],
        } satisfies LinkedAction,
      ],
    },
  };

  return c.json(response, 200);
});

app.get('/:amount', (c) => {
  const amount = c.req.param('amount');
  const { icon, title, description } = getDonateInfo();
  const response: Action = {
    type: 'action',
    icon,
    label: `${amount} SOL`,
    title,
    description,
  };
  return c.json(response, 200);
});

function getDonateInfo(): Pick<Action, 'icon' | 'title' | 'description'> {
  const icon =
    'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/';
  const title = 'Donate to Alice';
  const description =
    'Cybersecurity Enthusiast | Support my research with a donation.';
  return { icon, title, description };
}

app.post('/:amount?', async (c) => {
  const amount =
    c.req.param('amount') ?? DEFAULT_DONATION_AMOUNT_SOL.toString();
  const { account } = (await c.req.json()) as ActionPostRequest;

  const parsedAmount = parseFloat(amount);
  // 1. create transaction with reference
  const { tx, reference } =
    await prepareReferenceDonateTransactionUsingExtraInstruction(
      new PublicKey(account),
      new PublicKey(DONATION_DESTINATION_WALLET),
      parsedAmount * LAMPORTS_PER_SOL,
    );

  // 2. use DialectTransactionResponse type that enables experimental features
  const response: DialectTransactionResponse = {
    type: 'transaction',
    transaction: Buffer.from(tx.serialize()).toString('base64'),
    // 3. include reference in response
    dialectExperimental: {
      reference: reference.toString(),
    },
  };
  return c.json(response, 200);
});

// Option A) generate a reference instruction and put into transaction
async function prepareReferenceDonateTransactionUsingExtraInstruction(
  sender: PublicKey,
  recipient: PublicKey,
  lamports: number,
): Promise<{ tx: VersionedTransaction; reference: PublicKey }> {
  const payer = new PublicKey(sender);
  const transferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: new PublicKey(recipient),
    lamports: lamports,
  });
  // generate a new reference instruction that includes a unique reference key
  const { reference, referenceIx } = generateBlinkReferenceIx();
  // include it into transaction
  const tx = await prepareTransaction([transferIx, referenceIx], payer);
  return { tx, reference };
}

// Option B) generate a reference key and put extra key into existing instruction
async function prepareReferenceDonateTransactionUsingExistingInstruction(
  sender: PublicKey,
  recipient: PublicKey,
  lamports: number,
): Promise<{ tx: VersionedTransaction; reference: PublicKey }> {
  const payer = new PublicKey(sender);
  const transferIx = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: new PublicKey(recipient),
    lamports: lamports,
  });
  // generate unique reference key
  const reference = Keypair.generate().publicKey;
  // include it as read-only, non-signer key into existing transaction instruction
  transferIx.keys.push({
    pubkey: reference,
    isSigner: false,
    isWritable: false,
  });
  const tx = await prepareTransaction([transferIx], payer);
  return { tx, reference };
}

export default app;
