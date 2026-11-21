# Production image for fewbie-starter-based Next.js frontends (App Router).
#
# Multi-stage build: install + Next build, then copy only the .next output
# and production node_modules into a slim Node runtime. Next.js inlines
# NEXT_PUBLIC_* variables at build time, so they arrive as build args (R82-04);
# set them with `docker build --build-arg NEXT_PUBLIC_BASE_URL=...`. At runtime
# they cannot be changed — rebuild the image instead.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Browser-visible configuration is inlined by `next build`, so every
# NEXT_PUBLIC_* value must be present before this step.
ARG NEXT_PUBLIC_BASE_URL=""
ARG NEXT_PUBLIC_FRONTEND_MONITOR_ENDPOINT=""
ARG NEXT_PUBLIC_FRONTEND_MONITOR_TOKEN=""
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_FRONTEND_MONITOR_ENDPOINT=$NEXT_PUBLIC_FRONTEND_MONITOR_ENDPOINT \
    NEXT_PUBLIC_FRONTEND_MONITOR_TOKEN=$NEXT_PUBLIC_FRONTEND_MONITOR_TOKEN
# next.config.ts sets output: "standalone", so the build emits a
# self-contained server bundle. It bundles server deps internally, so the
# runtime stage only needs the file tree the Next CLI built. The directory is
# created here so hosts that add public assets always have a copy source.
RUN mkdir -p public && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    # Next.js standalone server: copy it out of the build stage's output tree.
    PORT=3000

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
