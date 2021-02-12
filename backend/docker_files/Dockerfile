
# The line below states we will base our new image on the 18.04 Official Ubuntu 

FROM ubuntu:18.04

# Identify the maintainer of an image
LABEL authors="Marlon P Campos,Osmar Bento da Silva Junior"  
 
# Installs new repos, ffmpeg, nodejs, npm and run npm to install modules
RUN apt-get update \ 
	&& apt-get install -y software-properties-common \ 
	&& add-apt-repository ppa:jonathonf/ffmpeg-4 -y \
	&& apt-get update \
	&& apt-get install --no-install-recommends -y ffmpeg curl \
	&& curl -sL https://deb.nodesource.com/setup_14.x | bash - \
	&& apt-get install -y nodejs \
	&& apt-get clean \
	&& npm init --yes && npm install --save ws express \
	&& npm install pm2 -g \
	&& mkdir -p /opt/ivs-simple-webrtc/www \
	&& cd /opt/ivs-simple-webrtc

# Expose port 80
EXPOSE 80

# Copy server.js to /opt/ivs-simple-webrtc folder
COPY server.js /opt/ivs-simple-webrtc/
COPY health-check.html /opt/ivs-simple-webrtc/www/

# Start webserver
CMD ["pm2-runtime","/opt/ivs-simple-webrtc/server.js","-i max"]
