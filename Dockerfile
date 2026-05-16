# ---------- Build Angular ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# ---------- Nginx ----------
FROM nginx:alpine
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy Angular build output
COPY --from=build /app/dist/trading-app-broker/browser/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
