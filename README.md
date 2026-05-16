# TradingAppBroker

Angular 17 frontend for the broker trading workspace.

## Development

Run:

```bash
npm install
npm start
```

The local dev server runs on `http://localhost:4200/`.

## Production build

Run:

```bash
npm run build
```

The production bundle is generated under `dist/trading-app-broker/browser/`.

## Docker

This repo includes a production Docker image build for the Angular app using Nginx.

### Build image locally

```bash
docker build -t shadyelshrief/broker-karepo:latest .
```

### Push to Docker Hub

```bash
docker push shadyelshrief/broker-karepo:latest
```

Docker Hub repository:

[shadyelshrief/broker-karepo](https://hub.docker.com/repository/docker/shadyelshrief/broker-karepo/general)

## Run with Docker Compose

Your colleague can run the frontend with:

```bash
docker compose up -d
```

The app will be available on:

```text
http://localhost:8080
```

The included `docker-compose.yml` pulls the published image directly from Docker Hub:

```yaml
services:
  broker-ui:
    image: shadyelshrief/broker-karepo:latest
    ports:
      - "8080:80"
```

## Notes

- The frontend is a static Angular build served by Nginx.
- Angular client-side routes are supported through `try_files ... /index.html`.
- The production environment currently points feeder auth/websocket to `localhost:7070`, so the colleague should also have the feeder/backend exposed on that host port if they want live market data.
