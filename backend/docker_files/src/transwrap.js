// transwrap.js https version 

/// import block
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const express = require('express');
const callff = require('child_process'); 

/// app socket definition
const app = express();
const port = 443
const servertype = 'HTTPS'
const home = 'wwww' /// for heath check only, you can also use as standalone server, by moving the frontend folder to the home www

// https certificates // Be sure to generate those before running
const newCert =  '/opt/ivs-simple-webrtc/cert.pem';
const newKey = '/opt/ivs-simple-webrtc/key.pem'
const certicates = {
  key: fs.readFileSync(newKey),
  cert: fs.readFileSync(newCert)
};

// wrapper server
const transwraper = https.createServer(certicates, app).listen(port, () => {console.log(`Listening on port: ${port} ${servertype}`)})

// websocket creation
const wsRef = new WebSocket.Server({ server: transwraper});

app.use((req, res, next) => {console.log(`${servertype}:${req.method}:${req.originalUrl}`);
    return next();
});

app.use(express.static(__dirname + home)); 

// Streaming
wsRef.on('connection', (ws, req) => {  
  console.log("Loop 1")
  ws.send('MSG: Connected to server'); /// Send this message to the app frontend
  console.log(`Got connection, URL: ${req.url}`)    
    ws.on('message', (evt) => {
      console.log('Event', evt);
      ffmpeg.stdin.write(evt);
    });

    ws.on('error', (err) => {
      console.log('ERROR on websocket', err);
    });

    const rtmpURL = req.url.slice(7)
    console.log(`URL seted is ${rtmpURL}`)

    ws.on('close', (evt) => {
      ffmpeg.kill('SIGINT');
      console.log(`Connection Closed: ${evt}`)    
    });

    const ffmpeg = callff.spawn(
      'ffmpeg', 
      ['-i', '-', '-vcodec', 'copy', '-preset', 'veryfast', '-tune', 'zerolatency', '-acodec', 'aac', '-reconnect', '3', '-reconnect_at_eof', '1', '-reconnect_streamed', '3',        '-f', 'flv', rtmpURL
    ]);
     
    ffmpeg.on('close', (code, signal) => {
      console.log(`FFMPEG closed, reason ${code} , ${signal}`);
      ws.send('Closing Socket'); /// message to front end
      ws.terminate();
    });

    ffmpeg.stdin.on('error', (e) => {
      ws.send(e);
      console.log(`FFMPEG ERROR: ${e}`)    
      ws.terminate();
    });

    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFMPEG MSG: ${data.toString()}`)    
      ws.send(data.toString());
    });
  });
