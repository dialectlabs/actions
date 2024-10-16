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
    title: 'External link',
    label: 'External link',
    description: 'External link example',
    links: {
      actions: [
        {
          type: 'external-link',
          label: 'Open website',
          href: '/api/external-link/link',
        },
        {
          type: 'external-link',
          label: 'Draft tweet',
          href: '/api/external-link/tweet?text={tweetText}',
          parameters: [
            {
              name: 'tweetText',
              type: 'text',
              label: 'Tweet text',
            },
          ],
        },
      ],
    },
  } satisfies ActionGetResponse);
});

app.post('/link', async (c) => {
  return c.json({
    type: 'external-link',
    externalLink: 'https://dialect.to/',
  } satisfies ActionPostResponse);
});

app.post('/tweet', async (c) => {
  const tweetText = c.req.query('text');

  return c.json({
    type: 'external-link',
    externalLink: `https://twitter.com/intent/tweet?text=${tweetText}`,
  } satisfies ActionPostResponse);
});

export default app;
