import { serve } from '@hono/node-server';
import donate from './donate/route';
import jupiterSwap from './jupiter-swap/route';
import heliusStake from './helius/stake/route';
import sanctumTrade from './sanctum/trade/route';
import tensorBuyFloor from './tensor/buy-floor/route';
import tensorBuyFilteredFloor from './tensor/buy-filtered-floor/route';
import tensorBidNft from './tensor/bid-nft/route';
import meteoraSwap from './meteora/swap/route';
import liveData from './live-data/route';
import chainedInlineBonkSwap from './chaining/inline/route';
import chainedPostBonkSwap from './chaining/post/route';
import chainedMinimalPost from './chaining/minimal-post/route';
import externalLink from './external-link/route';
import memo from './memo/route';
import { cors } from 'hono/cors';
import { Hono } from 'hono';

const app = new Hono();
app.use(
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'Accept-Encoding'],
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  }),
);

// <--Actions-->
app.route('/api/donate', donate);
app.route('/api/memo', memo);
app.route('/api/jupiter/swap', jupiterSwap);
app.route('/api/helius/stake', heliusStake);
app.route('/api/sanctum/trade', sanctumTrade);
app.route('/api/tensor/buy-floor', tensorBuyFloor);
app.route('/api/tensor/buy-filtered-floor', tensorBuyFilteredFloor);
app.route('/api/tensor/bid-nft', tensorBidNft);
app.route('/api/meteora/swap', meteoraSwap);
app.route('/api/live-data', liveData);
app.route('/api/chaining/inline/swap', chainedInlineBonkSwap);
app.route('/api/chaining/post/swap', chainedPostBonkSwap);
app.route('/api/chaining/minimal/post', chainedMinimalPost);
app.route('/api/external-link', externalLink);
// </--Actions-->

const port = 3003;
console.log(
  `Server is running on port ${port}
Visit http://localhost:${port}/swagger-ui to explore existing actions
Visit https://dial.to to unfurl action into a Blink
`,
);

serve({
  fetch: app.fetch,
  port,
});
