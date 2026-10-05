FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# No package installation or build step is needed: the server has no dependencies.
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node dist ./dist

USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
