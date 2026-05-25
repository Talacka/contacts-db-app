FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

# Run the seeding script to set up tables/initial data, then start the Express server
CMD ["sh", "-c", "npm run seed && npm start"]
