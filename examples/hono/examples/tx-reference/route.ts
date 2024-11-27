import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from '@solana/web3.js';
import { prepareTransaction } from '../../shared/transaction-utils';
import {
  Action,
  ActionPostRequest,
  LinkedAction,
} from '@solana/actions';
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
          ...DONATION_AMOUNT_SOL_OPTIONS.map((amount) => ({
            type: 'transaction',
            label: `${amount} SOL`,
            href: `/api/tx-reference/${amount}`,
          } satisfies LinkedAction)),
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
  },
);

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
  },
);

app.post('/:amount?', async (c) => {
    const amount =
      c.req.param('amount') ?? DEFAULT_DONATION_AMOUNT_SOL.toString();
    const { account } = (await c.req.json()) as ActionPostRequest;

    const parsedAmount = parseFloat(amount);
    const { tx, reference } = await prepareReferenceDonateTransaction(
      new PublicKey(account),
      new PublicKey(DONATION_DESTINATION_WALLET),
      parsedAmount * LAMPORTS_PER_SOL,
    );

    const response: DialectTransactionResponse = {
      type: 'transaction',
      transaction: Buffer.from(tx.serialize()).toString('base64'),
      dialectExperimental: {
        reference: reference.toString(),
      },
    };
    return c.json(response, 200);
  },
);

function getDonateInfo(): Pick<
  Action,
  'icon' | 'title' | 'description'
> {
  const icon =
    'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/';
  const title = 'Donate to Alice';
  const description =
    'Cybersecurity Enthusiast | Support my research with a donation.';
  return { icon, title, description };
}

async function prepareReferenceDonateTransaction(
  sender: PublicKey,
  recipient: PublicKey,
  lamports: number,
): Promise<{ tx: VersionedTransaction; reference: PublicKey }> {
  const payer = new PublicKey(sender);
  const { reference, referenceIx } = generateBlinkReferenceIx();
  const instructions = [
    referenceIx,
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: new PublicKey(recipient),
      lamports: lamports,
    }),
  ];
  const tx = await prepareTransaction(instructions, payer);
  return { tx, reference };
}

export default app;
