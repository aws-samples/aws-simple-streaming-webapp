## Transwrap container server instructions

The backend transwrap server (transwrap.js) is a simple socket server that receives a socket connection data in webm and transwrap / proxies the content to RTMP.

### General Instructions

#### 1) Running in a local envirolment: localhost

First install the dependencies and then use the file transwrap_local.js with node.
```
    npm install
    npm start-test transwrap_local.js
```

it should give the following result

Listening on port: 3004

#### 2) Running in production

The application frontent requires https, and the transwrap.js is built-in https Node.js module.
For running your server, first we need to create or install a SSL certificate.

The following instructions will generate the key.pem and cert.pem self-sigend certificates for our server.
Note: Self-signed certificates are not recomended for a non-development evirolment. You can user AWS Certificate Manager (link) to provision, manage, and deploy public and private SSL/TLS 

#### Generating certificate for develoment tests locally in HTTPS

```
    openssl genrsa -out key.pem
    openssl req -new -key key.pem -out csr.pem
    openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
    rm csr.pem
```

Running locally in HTTPS

```
    npm install
    npm start transwrap.js
```

The certificates has to be generated in the backend folder.