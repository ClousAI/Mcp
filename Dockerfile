# Hosted Clous MCP (Streamable HTTP) — served at https://mcp.clous.ai.
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
# --ignore-scripts: skip the `prepare` (tsc) lifecycle, which would run before
# src is copied. We build explicitly below once sources are present.
RUN npm install --no-audit --no-fund --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV PORT=8790
EXPOSE 8790
CMD ["node", "dist/http.js"]
