FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production
USER node
EXPOSE 3003
CMD ["node", "src/server.js"]