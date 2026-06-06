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
The container also proxies feeder HTTP and websocket traffic through Nginx so the browser does not hit the feeder directly.

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

Your colleague can run the frontend and feeder together with:

```bash
docker compose up -d
```

The app will be available on:

```text
http://localhost:8081
```

The feeder will be available on:

```text
http://localhost:7070
```

The included `docker-compose.yml` pulls the published image directly from Docker Hub and runs the feeder on the same Docker network:

```yaml
services:
  feeder:
    image: awad422/k-feeder:v1
    ports:
      - "7070:7070"

  broker-ui:
    image: shadyelshrief/broker-karepo:latest
    depends_on:
      - feeder
    environment:
      FEEDER_HOST: feeder
      FEEDER_PORT: "7070"
    ports:
      - "8081:80"
```

## Notes

- The frontend is a static Angular build served by Nginx.
- Angular client-side routes are supported through `try_files ... /index.html`.
- The Angular production build now uses same-origin feeder paths (`/feeder-api` and `/feeder-ws`), and Nginx forwards them to the feeder container.
