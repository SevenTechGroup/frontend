# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG VITE_API_URL
ARG VITE_ENABLE_OFFLINE_SYNC=true
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_ENABLE_OFFLINE_SYNC=${VITE_ENABLE_OFFLINE_SYNC}

RUN test -n "${VITE_API_URL}" && npm run build

FROM nginx:1.29-alpine AS runtime

ARG CSP_CONNECT_SRC

RUN test -n "${CSP_CONNECT_SRC}"

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
RUN sed -i "s|__CSP_CONNECT_SRC__|${CSP_CONNECT_SRC}|g" /etc/nginx/snippets/security-headers.conf \
    && nginx -t

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
