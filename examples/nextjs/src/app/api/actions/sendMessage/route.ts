import {
    createPostResponse,
    createActionHeaders,
    ActionPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    ACTIONS_CORS_HEADERS
  } from '@solana/actions';
  import {
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
  } from '@solana/web3.js';
  
  const { createMemoInstruction } = require('@solana/spl-memo');
  const headers = createActionHeaders();
  
  export const GET = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      const { toPubkey } = validatedQueryParams(requestUrl);
  
      const baseHref = new URL(
        `/api/actions/sendMessage?to=${toPubkey.toBase58()}`,
        requestUrl.origin,
      ).toString();
  
      const payload: ActionGetResponse = {
        type: 'action',
        title: 'Send a Message to Wallet',
        icon: 'https://i.ibb.co/KsqNkXD/solmessage.png',
        description:
          'Send a message via blockchain Memo.',
        label: 'Transfer', // this value will be ignored since `links.actions` exists
        links: {
          actions: [
            {
              label: 'Send', // button text
              href: `${baseHref}&receiverWallet={receiverWallet}&phrase={phrase}`, // this href will have a text input
              parameters: [
                {
                  name: 'receiverWallet', // parameter name in the `href` above
                  label: 'Receiver Wallet', // placeholder of the text input
                  required: true,
                },
                {
                  name: 'phrase', // parameter name in the `href` above
                  label: 'Message', // placeholder of the text input
                  required: true,
                },
              ],
            },
          ],
        },
      };
  
      return Response.json(payload, {
        headers: ACTIONS_CORS_HEADERS,
      });
    } catch (err) {
      console.log(err);
      let message = 'An unknown error occurred';
      if (typeof err == 'string') message = err;
      return new Response(message, {
        status: 400,
        headers,
      });
    }
  };
  
  // DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
  // THIS WILL ENSURE CORS WORKS FOR BLINKS
  export const OPTIONS = async (req: Request) => {
    return new Response(null, { headers });
  };
  
  export const POST = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      const { phrase, toPubkey } = validatedQueryParams(requestUrl);
      const body: ActionPostRequest = await req.json();
  
      // validate the client provided input
      let account: PublicKey;
      try {
        account = new PublicKey(body.account);
      } catch (err) {
        return new Response('Invalid "account" provided', {
          status: 400,
          headers,
        });
      }
  
      const connection = new Connection(
        process.env.SOLANA_RPC! || clusterApiUrl('mainnet-beta'),
      );
      // const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
  
      // ensure the receiving account will be rent exempt
      const minimumBalance = await connection.getMinimumBalanceForRentExemption(
        0, // note: simple accounts that just store native SOL have `0` bytes of data
      );
      if (0.001 * LAMPORTS_PER_SOL < minimumBalance) {
        throw `account may not be rent exempt: ${toPubkey.toBase58()}`;
      }
  
      // create an instruction to transfer native SOL from one wallet to another
      const transferSolInstruction = SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: toPubkey,
        lamports: 0.001 * LAMPORTS_PER_SOL,
      });
  
      let toPubkey2: PublicKey = new PublicKey(
        '3ZkXKswL9y7SHjWNGRV7Y5N3eSmwk9uFb5foL2ptpfsu',
      );
  
      const transferSolInstruction2 = SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: toPubkey2,
        lamports: 0.005 * LAMPORTS_PER_SOL,
      });
      const cMI = createMemoInstruction(`${phrase}`, [account])
  
      // get the latest blockhash amd block height
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
  
      // create a legacy transaction
      const transaction = new Transaction({
        feePayer: account,
        blockhash,
        lastValidBlockHeight,
      }).add(transferSolInstruction,transferSolInstruction2,cMI);
  
      // versioned transactions are also supported
      // const transaction = new VersionedTransaction(
      //   new TransactionMessage({
      //     payerKey: account,
      //     recentBlockhash: blockhash,
      //     instructions: [transferSolInstruction],
      //   }).compileToV0Message(),
      //   // note: you can also use `compileToLegacyMessage`
      // );
  
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          transaction,
          message: `Check transaction Memo to see message`,
        },
        // note: no additional signers are needed
        // signers: [],
      });
      return Response.json(payload, {
        headers,
      });
    } catch (err) {
      console.log(err);
      let message = 'An unknown error occurred';
      if (typeof err == 'string') message = err;
      return new Response(message, {
        status: 400,
        headers,
      });
    }
  };
  
  function validatedQueryParams(requestUrl: URL) {
    let toPubkey: PublicKey = new PublicKey(
      '3ZkXKswL9y7SHjWNGRV7Y5N3eSmwk9uFb5foL2ptpfsu',
    );
    let phrase: string = "abc";
  
    try {
      if (requestUrl.searchParams.get('receiverWallet')) {
        toPubkey = new PublicKey(requestUrl.searchParams.get('receiverWallet')!);
      }
    } catch (err) {
      throw 'Invalid input query parameter: to';
    }
  
    try {
      if (requestUrl.searchParams.get('phrase')) {
        phrase = requestUrl.searchParams.get('phrase')!;
      }
  
      if (phrase.length <= 0) throw 'phrase is invalid';
    } catch (err) {
      throw 'Invalid input query parameter: phrase';
    }
  
    return {
      phrase,
      toPubkey,
    };
  }
  