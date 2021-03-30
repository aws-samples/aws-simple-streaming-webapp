
# The line below states we will base our new image on the 18.04 Official Ubuntu 

FROM public.ecr.aws/ubuntu/ubuntu:18.04

# Identify the maintainer of an image
LABEL authors="Marlon P Campos,Osmar Bento da Silva Junior"  
 
# Installs new repos, ffmpeg, nodejs, npm and run npm to install modules and creates the certificates for the HTTPS transwrapper.js server
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
	&& cd /opt/ivs-simple-webrtc \
	&& openssl genrsa -out /opt/ivs-simple-webrtc/key.pem \
	&& openssl req -new -key /opt/ivs-simple-webrtc/key.pem -out /opt/ivs-simple-webrtc/csr.pem -subj "/C=US" \
	&& openssl x509 -req -days 9999 -in /opt/ivs-simple-webrtc/csr.pem -signkey /opt/ivs-simple-webrtc/key.pem -out /opt/ivs-simple-webrtc/cert.pem \
	&& rm /opt/ivs-simple-webrtc/csr.pem

# Expose port 443
EXPOSE 443

# Copy transwraper.js to /opt/ivs-simple-webrtc folder
COPY src* /opt/ivs-simple-webrtc/

# Copy health-check.html to /opt/ivs-simple-webrtc/www/ folder
COPY health* /opt/ivs-simple-webrtc/www/

# Start webserver
CMD ["pm2-runtime","/opt/ivs-simple-webrtc/transwrap.js","-i max"]