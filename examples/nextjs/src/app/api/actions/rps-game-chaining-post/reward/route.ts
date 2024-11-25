// /api/actions/rps-game-chaining-post/reward/route.ts
import {
    createActionHeaders,
    NextActionPostRequest,
    ActionError,
    CompletedAction,
    MEMO_PROGRAM_ID
} from "@solana/actions";
import {
    clusterApiUrl,
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
    Keypair,
} from "@solana/web3.js";

// Create headers for this route (including CORS)
const headers = createActionHeaders({
    chainId: 'devnet',
    actionVersion: '2.2.1',
});

// Load and initialize game wallet
let gameWallet: Keypair;
try {
    const privateKeyString = process.env.NEXT_PUBLIC_GAME_WALLET_PRIVATE_KEY;
    if (!privateKeyString) {
        throw new Error('GAME_WALLET_PRIVATE_KEY not found in environment');
    }
    const privateKeyArray = JSON.parse(privateKeyString);
    const secretKey = Uint8Array.from(privateKeyArray);
    gameWallet = Keypair.fromSecretKey(secretKey);
    console.log('Game wallet initialized with public key:', gameWallet.publicKey.toBase58());
} catch (error) {
    console.error('Failed to initialize game wallet:', error);
    throw new Error('Game wallet initialization failed');
}

// GET Request Code
// Since this is a next action endpoint, GET is not supported
export const GET = async () => {
    return Response.json({ message: "Method not supported" } as ActionError, {
        status: 403,
        headers,
    });
};

// OPTIONS Code
export const OPTIONS = async () => Response.json(null, { headers });

// POST Request Code
export const POST = async (req: Request) => {
    try {
        const body: NextActionPostRequest = await req.json();

        // Validate account
        let account: PublicKey;
        try {
            account = new PublicKey(body.account);
        } catch (err) {
            console.error(err);
            return Response.json({ message: 'Invalid account' } as ActionError, {
                status: 400,
                headers
            });
        }

        const connection = new Connection(
            process.env.SOLANA_RPC || clusterApiUrl("devnet")
        );

        // Confirm the previous transaction
        const signature = body.signature;
        if (!signature) {
            throw 'Invalid "signature" provided';
        }

        const status = await connection.getSignatureStatus(signature);
        if (
            !status ||
            !status.value ||
            !status.value.confirmationStatus ||
            !['confirmed', 'finalized'].includes(status.value.confirmationStatus)
        ) {
            throw "Unable to confirm the transaction";
        }

        // Get transaction details to determine game result
        const transaction = await connection.getParsedTransaction(signature, "confirmed");
        if (!transaction?.meta?.logMessages) {
            throw "Unable to fetch transaction details";
        }

        // Parse game result from memo
        const memoLog = transaction.meta.logMessages.find(log => log.includes('RPS Game'));
        if (!memoLog) throw "Invalid game transaction";

        const result = memoLog.includes('Result: win') ? 'win' : memoLog.includes('Result: draw') ? 'draw' : 'lose';
        const amount = parseFloat(memoLog.match(/Amount: ([\d.]+) SOL/)?.[1] || '0');

        // Return completed action for losses
        if (result === 'lose') {
            const payload: CompletedAction = {
                type: "completed",
                title: "Game Over!",
                icon: new URL("/RPS-game-image-001.jpeg", new URL(req.url).origin).toString(),
                label: "Better luck next time!",
                description: "You lost this round. Try again!",
            };
            return Response.json(payload, { headers });
        }

        // Process reward for wins/draws
        const reward = result === 'win' ? amount * 2 : amount;
        const rewardTx = new Transaction().add(
            new TransactionInstruction({
                keys: [],
                programId: new PublicKey(MEMO_PROGRAM_ID),
                data: Buffer.from(`RPS Reward | ${result.toUpperCase()} | Sent ${reward} SOL`, 'utf-8'),
            }),
            SystemProgram.transfer({
                fromPubkey: gameWallet.publicKey,
                toPubkey: account,
                lamports: reward * LAMPORTS_PER_SOL,
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        rewardTx.feePayer = gameWallet.publicKey;
        rewardTx.recentBlockhash = blockhash;
        rewardTx.sign(gameWallet);

        // Send the transaction
        const rawTransaction = rewardTx.serialize();
        const txId = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
        });

        // Use the new transaction confirmation strategy
        await connection.confirmTransaction({
            signature: txId,
            blockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
        }, "confirmed");

        const payload: CompletedAction = {
            type: "completed",
            title: result === 'win' ? "Congratulations!" : "It's a Draw!",
            icon: new URL("/RPS-game-image-001.jpeg", new URL(req.url).origin).toString(),
            label: "Reward Sent!",
            description: `${result === 'win' ? 'You won! ' : 'Game drawn! '}${reward} SOL has been sent to your wallet.`,
        };

        return Response.json(payload, { headers });
    } catch (err) {
        console.error(err);
        const actionError: ActionError = { message: "An unknown error occurred" };
        if (typeof err == "string") actionError.message = err;
        return Response.json(actionError, {
            status: 400,
            headers,
        });
    }
};