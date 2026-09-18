# ---- 构建阶段 ----
FROM node:22-alpine AS build
WORKDIR /app

COPY frontend/package*.json frontend/
RUN npm --prefix frontend install --legacy-peer-deps
COPY frontend/ frontend/
RUN npm --prefix frontend run build

COPY backend/package*.json backend/
# sqlite3 等原生模块在 ARM(如树莓派)上需现场编译，补齐构建工具链
RUN apk add --no-cache python3 make g++ \
  && npm --prefix backend install
COPY backend/ backend/
RUN npm --prefix backend run build

# ---- 运行阶段 ----
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/database.sqlite
ENV BACKUP_DIR=/app/data/backups

COPY --from=build /app/backend/node_modules backend/node_modules
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/package.json backend/package.json
COPY --from=build /app/frontend/dist frontend/dist

VOLUME ["/app/data"]
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

WORKDIR /app/backend
CMD ["node", "dist/index.js"]
