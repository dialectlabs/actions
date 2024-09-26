import { ActionGetResponse } from '@solana/actions';
import { Hono } from 'hono';

const LOGO =
  'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/';

interface DialectExperimentalFeatures {
  dialectExperimental?: {
    liveData?: {
      enabled: boolean;
      delayMs?: number; // default 1000 (1s)
    };
  };
}

const app = new Hono();

app.get('/', async (c) => {
    const response: ActionGetResponse & DialectExperimentalFeatures = {
      icon: LOGO,
      label: `${getRandomInt(1, 1000)}`,
      title: `${getRandomInt(1, 1000)}`,
      description: `${getRandomInt(1, 1000)}`,
      disabled: true,
      dialectExperimental: {
        liveData: {
          enabled: true,
        },
      },
    };
    return c.json(response);
  },
);

function getRandomInt(min: number, max: number) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

export default app;
