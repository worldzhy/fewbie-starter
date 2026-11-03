# Production image for fewbie-starter-based Next.js frontends (App Router).
#
# Multi-stage build: install + Next build, then copy only the .next output
# and production node_modules into a slim Node runtime. Next.js reads its
# config at build time, so no build-time env vars leak into the final image.
# Runtime NEXT_PUBLIC_* variables must be provided at `docker run` time.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# The default Next output is .next/standalone (Next 15 default). It bundles
# server deps internally, so we only need the file tree the Next CLI built.
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    # Next.js standalone server: copy it out of the build stage's output tree.
    PORT=3000

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
