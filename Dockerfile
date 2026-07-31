# ---------- Build Angular ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# ---------- Nginx ----------
FROM nginx:alpine
ENV ADMIN_API_HOST=host.docker.internal
ENV ADMIN_API_PORT=9090
ENV FEEDER_HOST=host.docker.internal
ENV FEEDER_PORT=7070
COPY ./nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Copy Angular build output
COPY --from=build /app/dist/trading-app-broker/browser/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
