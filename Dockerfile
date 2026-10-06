# Base image can be swapped for a registry mirror if Docker Hub is unreachable, e.g.
#   --build-arg NODE_IMAGE=<mirror>/library/node:22-alpine
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${NODE_IMAGE}
WORKDIR /app
# Supabase URL/key, AI_API_KEY etc. are read at runtime from the container's environment.
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
