# @dialectlabs/actions-examples

## Getting Started

First, run the development server:
```bash
npm install
npm run start
```

## How To

### Actions Development

1. See [Jupiter Router example](src/app/api/jupiter/swap/route.ts)
2. Build your own action 
   * Use specified openapi `responses` from [openapi.ts](src/app/openapi.ts) for your POST, GET methods
   * Use specified openapi `body` from [openapi.ts](src/app/openapi.ts) for your POST methods
3. Add your router to [index.ts](src/app/index.ts)

### Swagger UI
Open [http://localhost:3000/swagger-ui](http://localhost:3000/swagger-ui) with your browser to explore actions.

### Unfurl action into a Blink
To check and unfurl your or existing action open 
[https://actions.dialect.to/](https://actions.dialect.to/)  
e.g action for swap on Jupiter: <localhost:3000/api/jupiter/swap/USDC-SOL>

## Learn More
To learn more about Hono, take a look at the following resources:

- [Hono Documentation](https://hono.dev/docs/) - learn about Hono features and API.
