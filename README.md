# CyberPit Service

CyberPit is an Node.js open source self-hosted tool that captures HTTP requests, similar to how the [Mailpit](https://mailpit.axllent.org/) captures emails this service is intended to capture web hooks, if set correctly it can proxy pass the request to different endpoint when matched criteria, reply old requests, it can also do request fan-out.

## Development

- Uses pnpm as the main package manager.
- Express.js API with Google Cloud Functions Framework.
- Environment variables via dotenv.

### Scripts

- `pnpm start` — Runs the API locally using the Functions Framework on port 8080.

### Endpoints

- `GET /` — Health check route.
- `ALL /:user/:endpointHash` — Webhook endpoint that captures all methods and returns request details.

## Environment

Create a `.env` file for local environment variables as needed.

## Authors

It is part of the DevTools provided by CybeKit.cloud by Cyberpunk d.o.o. developers and any open source contributors under Apache 2.0 [licence](./LICENCE.md).
