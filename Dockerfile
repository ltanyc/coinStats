
# ===============================================================================
# Dockerfile
#   Builds Iquidus explorer and connect newyorkcoind
#
#
# It is based on Ubuntu 16.04 LTS
# ===============================================================================

# Set the base image to Ubuntu
FROM node:latest

# File Author / Maintainer
MAINTAINER nicovs_be

# ===============================================================================
# Env. Setup
#

# Update repository

# ----------------------------------------------------------
# Dependencies
# ----------------------------------------------------------

# Basic Dependencies
#

# ===============================================================================
# Set working directory
#
RUN mkdir -p /src
WORKDIR /src

# ===============================================================================
# Install configuration
#
RUN npm install -g forever
COPY index.js /src/index.js

EXPOSE 3009

CMD cd /src && forever start index.js

# ===============================================================================
# Install configuration
#
RUN npm install -g forever
COPY index.js /src/index.js
COPY package.json /src/package.json
CMD cd /src && npm install && forever -c 'node --harmony' index.js
