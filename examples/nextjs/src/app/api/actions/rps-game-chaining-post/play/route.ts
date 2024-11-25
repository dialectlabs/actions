// /api/actions/rps-game-chaining-post/play/route.ts
import {
    ActionGetResponse,
    ActionPostRequest,
    ActionPostResponse,
    createActionHeaders,
    createPostResponse,
    ActionError,
    MEMO_PROGRAM_ID,
} from "@solana/actions";
import {
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
 
// create the standard headers for this route (including CORS)
const headers = createActionHeaders({
    chainId: 'devnet',
    actionVersion: '2.2.1',
  });
 
// Game wallet to receive/send SOL
const GAME_WALLET = new PublicKey('FuRxfPnmfQ7RjKobbXdm7bs4VFT4DXXR3t7wC8dc4zb2');
 
 
// Helper function to determine winner
function determineWinner(playerMove: string, botMove: string): 'win' | 'lose' | 'draw' {
    if (playerMove === botMove) return 'draw';
 
    if (
        (playerMove === 'R' && botMove === 'S') ||
        (playerMove === 'P' && botMove === 'R') ||
        (playerMove === 'S' && botMove === 'P')
    ) {
        return 'win';
    }
 
    return 'lose';
}
 
// Generate bot move
function generateBotMove(): string {
    const moves = ['R', 'P', 'S'];
    return moves[Math.floor(Math.random() * moves.length)];
}
 
// GET Request Code
export const GET = async (req: Request) => {
    const payload: ActionGetResponse = {
        title: "Rock Paper Scissors",
        icon: new URL("/RPS-game-image-001.jpeg", new URL(req.url).origin).toString(),
        description: "Let's play Rock Paper Scissors! If you win you get DOUBLE your betted SOL, if it's a tie you get your betted SOL back, and if you lose you lose your betted SOL.",
        label: "Play RPS",
        links: {
            actions: [
                {
                    label: "Play!",
                    href: `${req.url}?amount={amount}&choice={choice}&opponent={opponent}`,
                    type: 'transaction',
                    parameters: [
                        {
                            type: "select",
                            name: "amount",
                            label: "Play Amount in SOL",
                            required: true,
                            options: [
                                { label: "0.01 SOL", value: "0.01" },
                                { label: "0.1 SOL", value: "0.1" },
                                { label: "1 SOL", value: "1" }
                            ]
                        },
                        {
                            type: "radio",
                            name: "choice",
                            label: "Choose your move",
                            required: true,
                            options: [
                                { label: "Rock", value: "R" },
                                { label: "Paper", value: "P" },
                                { label: "Scissors", value: "S" }
                            ]
                        },
                        {
                            type: "radio",
                            name: "opponent",
                            label: "Choose your opponent",
                            required: true,
                            options: [
                                { label: "Bot (Instant prize)", value: "bot" },
                                { label: "Friend (Multiplayer- NotAvailableNow)", value: "friend" }
                            ]
                        }
                    ]
                }
            ]
        }
    };
 
    return Response.json(payload, { headers });
};
 
 
//   OPTIONS Code
// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = async () => {
    return new Response(null, { headers });
};
 
 
//   POST Request Code
export const POST = async (req: Request) => {
    try {
        const url = new URL(req.url);
        const amount = parseFloat(url.searchParams.get('amount') || '0');
        const choice = url.searchParams.get('choice');
        const opponent = url.searchParams.get('opponent');
        const body: ActionPostRequest = await req.json();
 
        // Validate inputs
        if (!amount || amount <= 0) {
            return Response.json({ error: 'Invalid play amount' }, {
                status: 400,
                headers
            });
        }
 
        if (!choice || !['R', 'P', 'S'].includes(choice)) {
            return Response.json({ error: 'Invalid move choice' }, {
                status: 400,
                headers
            });
        }
 
        if (!opponent || !['bot', 'friend'].includes(opponent)) {
            return Response.json({ error: 'Invalid opponent choice' }, {
                status: 400,
                headers
            });
        }
 
        // Validate account
        let account: PublicKey;
        try {
            account = new PublicKey(body.account);
        } catch (err) {
            console.error(err);
            return Response.json({ error: 'Invalid account' }, {
                status: 400,
                headers
            });
        }
 
        //Establish connection with the Solana Blockchain
        const connection = new Connection(
            process.env.SOLANA_RPC || clusterApiUrl('devnet')
        );
 
        // Generate bot move and determine result
        const botMove = generateBotMove();
        const result = determineWinner(choice, botMove);
 
        // Create memo instruction with game details to record onchain
        const memoInstruction = new TransactionInstruction({
            keys: [],
            programId: new PublicKey(MEMO_PROGRAM_ID),
            data: Buffer.from(
                `RPS Game | Player: ${choice} | Bot: ${botMove} | Result: ${result} | Amount: ${amount} SOL`,
                'utf-8'
            ),
        });
 
        // Create payment instruction
        const paymentInstruction = SystemProgram.transfer({
            fromPubkey: account,
            toPubkey: GAME_WALLET,
            lamports: amount * LAMPORTS_PER_SOL,
        });
 
        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
 
        // Create transaction
        const transaction = new Transaction()
            .add(memoInstruction) // Add memo to transaction to record game play onchain
            .add(paymentInstruction); // Actual transaction
 
        transaction.feePayer = account;
        transaction.recentBlockhash = blockhash;
 
        // Create response using createPostResponse helper
        // Chain to reward route if win/draw
        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                type: 'transaction',
                transaction,
                message: `Game played! Your move: ${choice}, Bot's move: ${botMove}, Result: ${result}`,
                links: {
                    //     /**
                    //      * this `href` will receive a POST request (callback)
                    //      * with the confirmed `signature`
                    //      *
                    //      * you could also use query params to track whatever step you are on
                    //      */
                        next: {
                          type: "post",
                          href: "/api/actions/rps-game-chaining-post/reward",
                        },
                      },
            },
        });
 
        return Response.json(payload, { headers });
 
    } catch (err) {
        console.error(err);
        const actionError: ActionError = { 
            message: typeof err === 'string' ? err : 'Internal server error'
        };
        return Response.json(actionError, {
            status: 500,
            headers
        });
    }
};