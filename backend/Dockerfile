# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiamos package.json y package-lock.json
COPY package*.json ./

# Instalamos dependencias incluyendo las nuevas de Swagger
RUN npm install

# Copiamos el resto del código (server.js, database.js, routes/, etc.)
COPY . .

# El puerto que usa tu server.js
EXPOSE 5000

# Usamos "dev" para que nodemon reinicie si haces cambios, o "start" para producción
CMD ["npm", "start"]