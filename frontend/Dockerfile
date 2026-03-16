# Etapa 1: Build
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Copiamos el build al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configuración opcional de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
