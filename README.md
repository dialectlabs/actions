# @dialectlabs/actions

This repository contains reference implementations of Solana Actions using [Hono](https://hono.dev/).

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

## Presets

### Tensor Buy Floor

- Place your api key to `TENSOR_API_KEY` constant in tensor-api.ts

## How To

### Actions Development

1. See [Jupiter Swap Action example](examples/jupiter-swap/route.ts)
2. Build your own action
   - Use specified openapi `responses` from [openapi.ts](examples/openapi.ts) for your POST, GET methods
   - Use specified openapi `body` from [openapi.ts](examples/openapi.ts) for your POST methods
3. Add your router to [index.ts](examples/index.ts)

### Swagger UI

Open [http://localhost:3000/swagger-ui](http://localhost:3000/swagger-ui) with your browser to explore actions.

### Unfurl action into a Blink

To check and unfurl your or existing action open
[https://actions.dialect.to/](https://actions.dialect.to/)  
e.g action for swap on Jupiter: <localhost:3000/api/jupiter/swap/SOL-Bonk>

## Examples in this repo

There is a simple donate action as well as a memo action in this repo which serves as a template for creating your own actions.

There are also a few example actions in this repository for [Jupiter](examples/jupiter-swap/route.ts) (swap), [Helius](examples/helius/stake/route.ts) (stake), [Meteora](examples/meteora/swap/route.ts) (swap), [Sanctum](examples/sanctum/trade/route.ts) (stake), and [Tensor](examples/tensor) (buy floor or bid).

You can find the code for these actions in the [examples](examples) directory.

You can also unfurl these actions into Blinks on https://dial.to by entering the action URL into the Blink URL field.

For example, to unfurl the Helius stake action, you would enter the following URL into the Blink URL field:

`http://localhost:3000/api/helius/stake`

## Learn More

To learn more about Hono, take a look at the following resources:

- [Hono Documentation](https://hono.dev/docs/) - learn about Hono features and API.
