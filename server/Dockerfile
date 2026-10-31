FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5055

ENV NODE_ENV=production
ENV PORT=5055
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=knite_db
ENV DB_USER=admin
ENV DB_PASSWORD=StrongPassword123!

CMD ["node", "src/server.js"]
