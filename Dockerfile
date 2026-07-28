# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.14-debian AS development-dependencies
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.14-debian AS production-dependencies
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.14-debian AS builder
WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends git git-crypt gnupg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=development-dependencies /app/node_modules ./node_modules
COPY package.json bun.lock astro.config.mjs tsconfig.json components.json ./
COPY public ./public
COPY src ./src

# Coolify must expose the multiline `gpg_key` build variable as a Docker
# BuildKit secret. The encrypted environment file is bind-mounted from the
# build context and is never copied into an image layer.
RUN --mount=type=bind,source=.,target=/tmp/source,ro \
    --mount=type=secret,id=gpg_key,required=true \
    set -eu; \
    export GNUPGHOME=/tmp/gnupg; \
    install -d -m 0700 "$GNUPGHOME" /tmp/git-crypt-repo; \
    cp /tmp/source/.env /tmp/source/.gitattributes /tmp/git-crypt-repo/; \
    cp -R /tmp/source/.git-crypt /tmp/git-crypt-repo/.git-crypt; \
    cd /tmp/git-crypt-repo; \
    git init --quiet; \
    git config user.email "build@local"; \
    git config user.name "Build"; \
    git add -- .env .gitattributes .git-crypt; \
    git -c commit.gpgsign=false commit --quiet -m "build context snapshot"; \
    gpg --batch --yes --pinentry-mode loopback \
      --import /run/secrets/gpg_key; \
    git-crypt unlock; \
    git checkout --force -- .env; \
    cp .env /app/.env; \
    cd /app; \
    NODE_ENV=production bun run build; \
    rm -f /app/.env; \
    cd /; \
    rm -rf /tmp/git-crypt-repo "$GNUPGHOME"

FROM oven/bun:1.3.14-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=production-dependencies --chown=bun:bun \
    /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/dist ./dist
COPY --from=builder --chown=bun:bun /app/package.json ./package.json

USER bun

EXPOSE 3000

CMD ["bun", "run", "start"]
