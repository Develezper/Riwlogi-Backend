FROM oven/bun:1.3.9

WORKDIR /app

# Instalar Python
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --production

COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 8000

CMD ["bun", "src/server.js"]
