import { clusterApiUrl, Connection } from '@solana/web3.js';

export const connection = new Connection(clusterApiUrl('mainnet-beta'));
