import { Hono } from 'hono'
import { serve } from '@hono/node-server';
import donate from './api/donate/route';

const app = new Hono();

app.route('/api/donate', donate);

serve({
  fetch: app.fetch,
  port: 3000
})
