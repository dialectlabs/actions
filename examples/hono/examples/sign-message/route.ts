import {
  Action,
  ActionError,
  ActionPostRequest,
  NextActionPostRequest,
  SignMessageData,
  SignMessageResponse,
} from '@solana/actions-spec';
import { Hono } from 'hono';
import { Keypair, PublicKey } from '@solana/web3.js';

import nacl from 'tweetnacl';
import * as bs58 from 'bs58';
import { createSignMessageText } from '@solana/actions';
import { cors } from 'hono/cors';

const app = new Hono();

app.use(
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Content-Encoding',
      'Authorization',
      'Accept-Encoding',
    ],
  }),
);

const message = 'This is example plaintext statement';

const signMessageAction = {
  type: 'action',
  label: 'Sign statement',
  icon: 'https://img.step.finance/unsafe/s-1500/plain/https%3A%2F%2Fsf-cms.step.finance%2Fassets%2Fcaa40cff-c1b2-4494-bc55-5ed721a62e56',
  title: 'Sign statement demo',
  description: 'This is sign statement demo',
  links: {
    actions: [
      {
        type: 'message',
        href: '/sign-plain',
        label: 'Sign plain',
      },
      {
        type: 'message',
        href: '/sign-structured',
        label: 'Sign structured',
      },
    ],
  },
} satisfies Action;

app.get('/', async (c) => {
  return c.json(signMessageAction);
});

app.post('/sign-plain', async (c) => {
  const response: SignMessageResponse = {
    type: 'message',
    data: message,
    links: {
      next: {
        type: 'post',
        href: '/sign-plain/verify-signature',
      },
    },
  };
  return c.json(response);
});

app.post('/sign-plain/verify-signature', async (c) => {
  const { signature, account, state } =
    await c.req.json<NextActionPostRequest>();
  if (!signature) {
    return c.json({
      message: 'Signature is required',
    } satisfies ActionError);
  }
  const isSignatureValid = verifySignature(message, signature, account);
  if (!isSignatureValid) {
    return c.json({
      ...signMessageAction,
      title: 'Signature invalid',
      description: `Invalid message signature!
account = ${account}
message = ${message}
signature = ${signature}`,
    } satisfies Action);
  }
  return c.json({
    ...signMessageAction,
    title: 'Signature valid',
    description: `Valid message signature!
account = ${account}
message = ${message}
signature = ${signature}`,
  } satisfies Action);
});

// Secret key to be used for optionally signing messages by action server
// Hardcoded for demo purposes, in real world should be stored securely
const serverSigningKeypair = nacl.sign.keyPair.fromSecretKey(
  Uint8Array.from(
    bs58.decode(
      '2NNPV1WzBQaXkEC7h8S1HBRMcSHB2GhC7XVn6Z3nCccJF3DFHBg9MLiDiidk8HCxn4sPvD1SKq6HPMjBxwbyjGK',
    ),
  ),
);

app.post('/sign-structured', async (c) => {
  const { account } = await c.req.json<ActionPostRequest>();
  // 1. Generate sign message data
  const signMessageData: SignMessageData = {
    address: account,
    domain: 'localhost:3000', // In real world should be the domain of the action server
    statement: 'This is example structured statement',
    issuedAt: new Date().toISOString(),
    nonce: Keypair.generate().publicKey.toString(),
  };
  // 2. Generate server signature for the message to later during verification ensure message was not tampered
  // 2.1 Serialize sign message data to a standard text format, same format is used by clients to generate the plaintext message
  const message = createSignMessageText(signMessageData);
  // 2.2 Sign the text with server keypair
  const serverSignature = bs58.encode(
    nacl.sign.detached(
      new TextEncoder().encode(message),
      serverSigningKeypair.secretKey,
    ),
  );
  // 2.3 State will be used to store the message and server signature to later verify the message
  const state: { message: string; serverSignature: string } = {
    message,
    serverSignature,
  };
  const response: SignMessageResponse = {
    type: 'message',
    data: signMessageData,
    state: JSON.stringify(state),
    links: {
      next: {
        type: 'post',
        href: '/sign-structured/verify-signature',
      },
    },
  };
  return c.json(response);
});

app.post('/sign-structured/verify-signature', async (c) => {
  try {
    const { signature, account, state } =
      await c.req.json<NextActionPostRequest>();
    if (!signature || !state) {
      return c.json({
        message: 'Signature & state are required',
      } satisfies ActionError);
    }
    // 1. Verify server signature to ensure is was not tampered
    const { message, serverSignature } = JSON.parse(state) as {
      message: string;
      serverSignature: string;
    };
    const serverSignatureVerificationResult = verifySignature(
      message,
      serverSignature,
      bs58.encode(serverSigningKeypair.publicKey),
    );
    // 2. Verify user signature
    const userSignatureVerificationResult = verifySignature(
      message,
      signature,
      account,
    );

    // 3. Signature is valid if both server and user signatures are valid
    const verificationResult =
      serverSignatureVerificationResult && userSignatureVerificationResult;

    if (!verificationResult) {
      return c.json({
        ...signMessageAction,
        title: 'Signature invalid',
        description: `Invalid message signature!
${message}

server signature = ${serverSignature}
server signature valid = ${serverSignatureVerificationResult}
user signature = ${signature}
user signature valid = ${userSignatureVerificationResult}`,
      } satisfies Action);
    }
    return c.json({
      ...signMessageAction,
      title: 'Signature valid',
      description: `Valid message signature!
${message}

server signature = ${serverSignature}
server signature valid = ${serverSignatureVerificationResult}
user signature = ${signature}
user signature valid = ${userSignatureVerificationResult}`,
    } satisfies Action);
  } catch (e) {
    return c.json({
      ...signMessageAction,
      title: 'Signature verification failed',
    });
  }
});

function verifySignature(message: string, signature: string, account: string) {
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = Uint8Array.from(bs58.decode(signature));
  return nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    Uint8Array.from(new PublicKey(account).toBuffer()),
  );
}

export default app;
