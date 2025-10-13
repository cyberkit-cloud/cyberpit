# Fan-out Service

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
