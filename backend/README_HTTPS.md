## Transwrap container server instructions

The backend transwrap server (transwrap.js) is a simple socket server that receives a socket connection data in webm and transwrap / proxies the content to RTMP.

### General Instructions

#### 1) Running in a local envirolment: localhost HTTP

First install the dependencies and then use the file transwrap_local.js with node.
```
    cd backend/
    npm install
    npm start-test transwrap_local.js
```

it should give the following result

Listening on port: 3004

#### 2) Running in HTTPS

The application frontent requires https, and the transwrap.js is built-in https Node.js module.
For running your server, first we need to create or install a SSL certificate.

The following instructions will generate the key.pem and cert.pem self-sigend certificates for our server.
Note: Self-signed certificates are not recomended for a non-development evirolment. You can user AWS Certificate Manager (link) to provision, manage, and deploy public and private SSL/TLS 

#### Generating certificate for develoment tests locally in HTTPS

```
cd backend/
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
```

Running locally in HTTPS

```
npm run startDevs
```

The certificates has to be generated in the backend folder.

:warning: **Note:** For test purpose only.
Open it on your web browser type https://127.0.0.1:3004 and accept the self signed certificate.

<img src="../doc/sslerror.png" alt="ssl error" />

## [Return to the frontend deployment](../frontend/README.md)

To allow localhost on ssl, you can paste this line in the address bar and proceed to allow localhost, instructions for *chrome only*. 

```chrome://flags/#allow-insecure-localhost```

:warning: **Note:** For test purpose only. remenber to restore this configuration after you finish your tests.

-------
Note: This project uses FFMPEG please check lisencing aspects.  
FFmpeg is licensed under the GNU Lesser General Public License (LGPL) version 2.1 or later. However, FFmpeg incorporates several optional parts and optimizations that are covered by the GNU General Public License (GPL) version 2 or later. If those parts get used the GPL applies to all of FFmpeg.