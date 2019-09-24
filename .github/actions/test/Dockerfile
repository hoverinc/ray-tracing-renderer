FROM node:10.15.3-alpine

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

# install node packages
RUN npm install

LABEL "com.github.actions.name"="Check"
LABEL "com.github.actions.description"="Run unit tests"
LABEL "com.github.actions.icon"="check-circle"
LABEL "com.github.actions.color"="green"

COPY "entrypoint.sh" "/entrypoint.sh"
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
