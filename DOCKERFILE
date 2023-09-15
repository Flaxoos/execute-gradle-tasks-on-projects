# Use an official Node runtime as a parent image
FROM node:19.7.0

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install TypeScript globally
RUN npm install -g typescript

# Install any needed packages specified in package.json
RUN npm install

# Compile TypeScript code
COPY . .
RUN tsc

ENTRYPOINT ["node", "dist/index.js"]
