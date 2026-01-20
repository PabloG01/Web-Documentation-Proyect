# frontend/Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Instalamos dependencias (legacy-peer-deps ayuda con conflictos en React 19)
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

# Esto ejecutará "vite" según tu package.json
CMD ["npm", "start"]