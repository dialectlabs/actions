# @dialectlabs/actions

This repository contains reference implementations of Solana Actions using [Hono](https://hono.dev/), [Next.js](https://nextjs.org/), and [Express](https://expressjs.com/).

## Getting Started

For Hono, run the development server in the root directory:

For Next.js, run the development server in it's [directory](examples/nextjs):

For Express, run the development server in the subfolder in it's [directory](examples/express):

```bash
npm install
npm run dev
```

## Presets

### Tensor Buy Floor

- Place your api key to `TENSOR_API_KEY` constant in tensor-api.ts

## How To

### Unfurl Action Into a Blink

To unfurl your action, open
[https://dialect.to/](https://dialect.to/).

For example, if you have the Hono server running, you can input
`localhost:3003/api/jupiter/swap/SOL-Bonk`.

### Actions Development with Hono

1. See [Jupiter Swap Action example](examples/hono/examples/jupiter-swap/route.ts)
2. Build your own action
3. Add your router to [index.ts](examples/hono/examples/index.ts)

### Actions Development with Next.js

1. See [Donate Native SOL Action example](examples/nextjs/src/app/api/actions/donate-sol/route.ts)
2. Build your own action
   - Create a new folder in [src/app/api/actions](examples/nextjs/src/app/api/actions) with your action name
   - Under that folder, create a route.ts file with your action

### Actions Development with Express

1. See [Donate Native SOL Action example](examples/express/transfer-sol/server.js)
2. Build your own action
   - Create a new folder in [examples/express](examples/express) with your action name
   - Under that folder, create a server.js file with your action and make the necessary imports

## Examples in this repo

### Hono

There is a simple [donate](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/donate/route.ts) action as well as a [memo](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/memo/route.ts) action in this repo which serves as a template for creating your own actions.

Basic examples
1. [Jupiter](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/jupiter-swap/route.ts) (swap)
2. [Helius](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/helius/stake/route.ts) (stake) 
3. [Meteora](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/meteora/swap/route.ts) (swap) 
4. [Sanctum](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/sanctum/trade/route.ts) (stake) 
5. [Tensor](https://github.com/dialectlabs/actions/tree/main/examples/hono/examples/tensor) (buy floor or bid)

Live data examples
1. [Basic live data](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/live-data/route.ts)

Action chaining examples
1. [Inline chaining](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/chaining/inline/route.ts)
2. [Post-request chaining](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/chaining/post/route.ts)

External link examples
1. [External link](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/external-link/route.ts)

Sign message examples
1. [Sign message](https://github.com/dialectlabs/actions/blob/main/examples/hono/examples/sign-message/route.ts)

You can also unfurl these actions into Blinks on https://dial.to by entering the action URL into the Blink URL field.

For example, to unfurl the Helius stake action, you would enter the following URL into the Blink URL field:

`http://localhost:3000/api/helius/stake`

### Next.js

There are a few example actions in this repository for [Donating Native SOL](examples/nextjs/src/app/api/actions/donate-sol/route.ts) and [Donating SPL Tokens](https://github.com/dialectlabs/actions/blob/main/examples/nextjs/src/app/api/actions/donate-spl/route.ts).

To unfurl these actions into Blinks on https://dial.to by entering the action URL into the Blink URL field.

For example, to unfurl the Donate Native SOL action, you would enter the following URL into the Blink URL field:

`http://localhost:3000/api/actions/donate-sol`

### Express

There is an example action in this repository for [Donating Native SOL](examples/express/transfer-sol/server.js).

To unfurl this action into Blinks on https://dial.to by entering the action URL into the Blink URL field.

For example, to unfurl the Donate Native SOL action, you would enter the following URL into the Blink URL field:

`http://localhost:8080/api/actions/transfer-sol`

## Learn More

To learn more about Hono, take a look at the following resources:

- [Hono Documentation](https://hono.dev/docs/) - learn about Hono features and API.

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

To learn more about Express, take a look at the following resources:

- [Express Documentation](https://expressjs.com/en/guide/routing.html) - learn about Express features and API.
