import { ResponseConfig } from '@asteasolutions/zod-to-openapi/dist/openapi-registry';
import { z } from '@hono/zod-openapi';

export const actionsSpecOpenApiGetResponse: Record<string, ResponseConfig> = {
  '200': {
    description: 'Action GET 200 Response',
    content: {
      'application/json': {
        schema: z.object({
          icon: z.string(), // image
          label: z.string(), // button text
          title: z.string(),
          description: z.string(),
          disabled: z.boolean().optional(), // allows to model invalid state of the action e.g. nft sold out
          links: z.object({
            // linked actions inspired by HAL https://datatracker.ietf.org/doc/html/draft-kelly-json-hal-11
            actions: z
              .array(
                z.object({
                  href: z.string(), // solana pay/actions get/post url
                  label: z.string(), // button text
                  // optional parameters for the action, e.g. input fields, inspired by OpenAPI
                  // enforcing single parameter for now for simplicity and determenistic client UIs
                  // can be extended to multiple inputs w/o breaking change by switching to Parameter[]
                  // note: there are no use-cases for multiple parameters atm, e.g. farcaster frames also have just single input
                  parameters: z.array(
                    z.object({
                      name: z.string(), // parameter name in url
                      label: z.string().optional(), // input placeholder
                    }),
                  ),
                }),
              )
              .optional(),
          }),
          // optional error indication for non-fatal errors, if present client should display it to the user
          // doesn't prevent client from interpreting the action or displaying it to the user
          // e.g. can be used together with 'disabled' to display the reason e.g. business constraint failure
          error: z.object({
            message: z.string(),
          }),
        }),
      },
    },
  },
};

export const actionSpecOpenApiPostRequestBody = {
  content: {
    'application/json': {
      schema: z.object({
        account: z.string(),
      }),
    },
  },
};

export const actionsSpecOpenApiPostResponse: Record<string, ResponseConfig> = {
  '200': {
    description: 'Action POST 200 Response',
    content: {
      'application/json': {
        schema: z.object({
          transaction: z.string(), // base64-encoded serialized transaction
          message: z.string().optional(), // the nature of the transaction response e.g. the name of an item being purchased
          redirect: z.string().optional(), // redirect URL after the transaction is successful
        }),
      },
    },
  },
};
