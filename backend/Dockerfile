# backend/Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copiamos package.json y package-lock.json
COPY package*.json ./

# Instalamos git (requerido por simple-git para clonar repos)
RUN apk add --no-cache git

# Instalamos dependencias incluyendo las nuevas de Swagger
RUN npm install

# Copiamos el resto del código (server.js, database.js, routes/, etc.)
COPY . .

# El puerto que usa tu server.js
EXPOSE ${PORT}

# Usamos "dev" para que nodemon reinicie si haces cambios, o "start" para producción
CMD ["npm", "run", "dev"]