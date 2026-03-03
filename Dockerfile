FROM us-central1-docker.pkg.dev/adc-core-artifacts/adc/node:d2590f05c4fab0e99431b3bb0466b462017da677@sha256:80ee6b081a870145041fc5f4b1e4e201f349d5a81218ef9d78a54a163fbf546f

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
