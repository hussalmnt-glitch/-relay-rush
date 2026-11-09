FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data
COPY package.json README.md LICENSE ./
COPY src ./src
COPY bot ./bot
COPY docs ./docs
COPY tests ./tests
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "src/server/server.mjs"]
