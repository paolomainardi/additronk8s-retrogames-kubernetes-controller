FROM node:15-slim

WORKDIR /app

COPY package* ./
RUN npm install

COPY . .
CMD ["node", "index"]