# --- Stage 1: Build ---
FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependencias necesarias para la construcción
COPY package*.json ./
RUN npm install

# Copiar el resto del código y construir la aplicación
COPY . .
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-slim

WORKDIR /app

# Definir variables de entorno de producción
ENV NODE_ENV=production

# Copiar solo los archivos necesarios de la etapa anterior
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Instalar solo las dependencias de producción
# Esto incluye las dependencias que esbuild marcó como 'external'
RUN npm install --omit=dev

# Cloud Run escucha en el puerto definido por la variable PORT
EXPOSE 8080

# Comando para iniciar el servidor
CMD ["npm", "start"]
