import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';
import { prepareTransaction } from '../../shared/transaction-utils';
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  MEMO_PROGRAM_ID,
} from '@solana/actions';
import { Hono } from 'hono';

const MEMO_DESTINATION_WALLET = '3h4AtoLTh3bWwaLhdtgQtcC3a3Tokb8NJbtqR9rhp7p6';

const app = new Hono();

app.get('/', (c) => {
    const { icon, title, description } = getMemoInfo();
    const memoParameterName = 'memo';
    const response: ActionGetResponse = {
      type: 'action',
      icon,
      label: `Send a message to Alice`,
      title,
      description,
      links: {
        actions: [
          {
            href: `/api/memo/{${memoParameterName}}`,
            label: 'Send a message',
            parameters: [
              {
                name: memoParameterName,
                label: 'Enter a custom message',
              },
            ],
          },
        ],
      },
    };
    return c.json(response, 200);
  },
);

app.post('/:memo?', async (c) => {
    const memo = c.req.param('memo') ?? 'Hello world!';
    const { account } = (await c.req.json()) as ActionPostRequest;
    const transaction = await prepareMemoTransaction(
      new PublicKey(account),
      new PublicKey(MEMO_DESTINATION_WALLET),
      memo,
    );

    const response: ActionPostResponse = {
      transaction: Buffer.from(transaction.serialize()).toString('base64'),
      message: `Sent a message to Alice: ${memo}`,
    };
    return c.json(response, 200);
  },
);

function getMemoInfo(): Pick<
  ActionGetResponse,
  'icon' | 'title' | 'description'
> {
  const icon =
    'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/';
  const title = 'Send a message to Alice';
  const description =
    'Cybersecurity Enthusiast | Give some feedback on my research.';
  return { icon, title, description };
}

async function prepareMemoTransaction(
  sender: PublicKey,
  recipient: PublicKey,
  memoData: string,
): Promise<VersionedTransaction> {
  const payer = new PublicKey(sender);
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: recipient,
      lamports: 1,
    }),
    new TransactionInstruction({
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(memoData, 'utf8'),
      keys: [],
    }),
  ];
  return prepareTransaction(instructions, payer);
}

export default app;
