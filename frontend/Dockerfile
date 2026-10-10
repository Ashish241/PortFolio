FROM node:22-alpine AS build
ARG SITE_URL=http://localhost:8080
ENV SITE_URL=$SITE_URL
WORKDIR /portfolio
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
COPY content ./content
RUN cd frontend && npm run build

FROM nginx:1.28-alpine
COPY --from=build /portfolio/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /portfolio/frontend/dist /usr/share/nginx/html
EXPOSE 80
