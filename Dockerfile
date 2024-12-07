# syntax=docker/dockerfile:1

ARG app_dir="/home/node/app"


FROM node:20-alpine AS base
ARG app_dir
WORKDIR ${app_dir}


FROM base AS dependencies

RUN --mount=type=bind,source=package.json,target=package.json \
	--mount=type=bind,source=package-lock.json,target=package-lock.json \
	--mount=type=cache,target=/root/.npm \
	npm ci --omit=dev


# for build mii-js libs for fix error
# RUN cd ${app_dir}/node_modules/mii-js && npm install && npm run build


FROM base AS build

RUN --mount=type=bind,source=package.json,target=package.json \
	--mount=type=bind,source=package-lock.json,target=package-lock.json \
	--mount=type=cache,target=/root/.npm \
	npm ci

COPY . .
RUN npm install


FROM base AS final
ARG app_dir

RUN mkdir -p ${app_dir}/logs && chown node:node ${app_dir}/logs

ENV NODE_ENV=production
USER node

COPY package.json .

COPY --from=dependencies ${app_dir}/node_modules ${app_dir}/node_modules

COPY . .

RUN ls -alh ${app_dir}

CMD ["node", "src/index.js"]