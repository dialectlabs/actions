# @dialectlabs/actions

This repository contains reference implementations of Solana Actions using [Hono](https://hono.dev/).

## Getting Started

First, run the development server:
```bash
npm install
npm run dev
```

## How To

### Actions Development

1. See [Jupiter Swap Action example](examples/jupiter-swap/route.ts)
2. Build your own action 
   * Use specified openapi `responses` from [openapi.ts](examples/openapi.ts) for your POST, GET methods
   * Use specified openapi `body` from [openapi.ts](examples/openapi.ts) for your POST methods
3. Add your router to [index.ts](examples/index.ts)

### Swagger UI
Open [http://localhost:3000/swagger-ui](http://localhost:3000/swagger-ui) with your browser to explore actions.

### Unfurl action into a Blink
To check and unfurl your or existing action open 
[https://actions.dialect.to/](https://actions.dialect.to/)  
e.g action for swap on Jupiter: <localhost:3000/api/jupiter/swap/SOL-Bonk>

## Learn More
To learn more about Hono, take a look at the following resources:

- [Hono Documentation](https://hono.dev/docs/) - learn about Hono features and API.
