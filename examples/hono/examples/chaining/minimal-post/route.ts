import {
  Action,
  ActionGetResponse,
  ActionPostResponse,
  CompletedAction,
} from '@solana/actions';
import { Hono } from 'hono';

const LOGO =
  'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/';

const app = new Hono();

app.get('/', async (c) => {
  return c.json({
    type: 'action',
    icon: LOGO,
    title: 'Action chaining',
    label: 'Action chaining',
    description: 'Chaining multiple actions.',
    links: {
      actions: [
        {
          type: 'post',
          label: 'Continue',
          href: '/api/chaining/minimal/post/continue/1',
        },
        {
          type: 'post',
          label: 'Complete',
          href: '/api/chaining/minimal/post/complete/1',
        },
      ],
    },
  } satisfies ActionGetResponse);
});

app.post('/continue/:num', async (c) => {
  const num = parseInt(c.req.param('num'));

  return c.json({
    type: 'post',
    links: {
      next: {
        type: 'post',
        href: `/api/chaining/minimal/post/continue/chain/${num + 1}`,
      },
    },
  } satisfies ActionPostResponse);
});

app.post('/continue/chain/:num', async (c) => {
  const num = c.req.param('num');
  return c.json({
    type: 'action',
    title: `Chained action #${num}`,
    label: `Chained action #${num}`,
    icon: LOGO,
    description: `Chained action #${num}`,
    links: {
      actions: [
        {
          type: 'post',
          label: 'Continue',
          href: `/api/chaining/minimal/post/continue/${num}`,
        },
        {
          type: 'post',
          label: 'Complete',
          href: `/api/chaining/minimal/post/complete/${num}`,
        },
      ],
    },
  } satisfies Action);
});

app.post('/complete/:num', async (c) => {
  const num = parseInt(c.req.param('num'));

  return c.json({
    type: 'post',
    links: {
      next: {
        type: 'post',
        href: `/api/chaining/minimal/post/complete/chain/${num}`,
      },
    },
  } satisfies ActionPostResponse);
});

app.post('/complete/chain/:num', async (c) => {
  const num = c.req.param('num');
  return c.json({
    type: 'completed',
    icon: LOGO,
    title: `Action completed with ${num} chained actions`,
    label: `Action`,
    description: `Action completed with ${num} chained actions`,
  } satisfies CompletedAction);
});

export default app;
