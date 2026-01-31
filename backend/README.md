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

## Docker compose setup

See the example configuration in [docker-compose.yaml](../examples/self-hosted/docker-compose.yaml):

```yaml
# For the complete and up-to-date configuration, see:
# https://github.com/cyberkit-cloud/cyberpit/blob/main/examples/self-hosted/docker-compose.yaml

services:
  cyberpit:
    image: cyberkit/cyberpit:latest
    ports:
      - "14111:8080"
      - "14090:9090"
    # ... see the full file for complete configuration
```

### Configuration example

```
CONFIGURATION="{\"cyberpit\":{\"f7362c7fa60c93fa19e1f34dc2fed41e\":{\"type\":\"FAN-OUT\",\"response\":\"COLLECTIVE_200_OK\",\"endpoints\":[]}}}"
```

## Environment

Create a `.env` file for local environment variables as needed.
