FROM node:20-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

# Install dependencies (sqlite3 native bindings require build tools)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .



EXPOSE 3000

CMD ["sh", "-c", "node db/init.js && node app.js"]
