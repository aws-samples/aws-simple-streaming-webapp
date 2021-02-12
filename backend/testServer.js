/// int version
// based on https://github.com/fbsamples/Canvas-Streaming-Example


const child_process = require('child_process'); // To be used later for running FFmpeg
const express = require('express');
const http = require('http');
const WebSocketServer = require('ws').Server;

//const fs = require('fs');

//const options = {
//	key: fs.readFileSync('key.pem'),
//	cert: fs.readFileSync('cert.pem')
//};

const app = express();
const port = 3004
const server = http.createServer(app).listen(port, () => {
  console.log('Listening on port...',port);
});

const wss = new WebSocketServer({
    server: server
  });

app.use((req, res, next) => {
    console.log('HTTP Request: ' + req.method + ' ' + req.originalUrl);
    return next();
});

app.use(express.static(__dirname + '/www'));


wss.on('connection', (ws, req) => {

    console.log('Connection Received!!!', req.url);
    ws.send('Connected to server');

    let match;
    if ( !(match = req.url.match(/^\/rtmps\/(.*)$/)) ) {
      console("is not RTMPS", req.url)
      ws.send('ERROR, Not a RTMP Connection');
      ws.terminate(); // No match, reject the connection.
      return;
    }

    const rtmpUrl = decodeURIComponent(match[1]);
    console.log('Target RTMP URL:', rtmpUrl);


    //const key = 'sk_us-east-1_ZMHMaVlKIfqo_kyJKa4Rzvp0I7tvuBtrWkI8QCiVsNi';
    //const rtmpUrl = `rtmps://ca538d4d3d92.global-contribute.live-video.net:443/app/${key}`;
    //console.log('Target RTMP URL:', rtmpUrl);

    // Launch FFmpeg to handle all appropriate transcoding, muxing, and RTMP.
    // If 'ffmpeg' isn't in your path, specify the full path to the ffmpeg binary.
    const ffmpeg = child_process.spawn('ffmpeg', [
      //input
       '-i', '-', 
       //video
       '-vcodec', 'copy', '-preset', 'veryfast', '-tune', 'zerolatency',
       //audio
       '-acodec', 'aac',
       //Restransmission ==> add some extra latency
       '-reconnect', '3', '-reconnect_at_eof', '1', '-reconnect_streamed', '3',
       //wrapping
       '-f', 'flv', rtmpUrl
     ]);

    // If FFmpeg stops for any reason, close the WebSocket connection.
    ffmpeg.on('close', (code, signal) => {
      console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
      ws.send('Closing Socket');
      ws.terminate();
    });

    // Handle STDIN pipe errors by logging to the console.
    // These errors most commonly occur when FFmpeg closes and there is still
    // data to write.  If left unhandled, the server will crash.
    ffmpeg.stdin.on('error', (e) => {
      ws.send(e);
      console.log('FFmpeg STDIN Error', e);
      ws.terminate();
    });

    // FFmpeg outputs all of its messages to STDERR.  Let's log them to the console.
    ffmpeg.stderr.on('data', (data) => {
      console.log('FFmpeg STDERR:', data.toString());
      ws.send(data.toString());
    });

    // When data comes in from the WebSocket, write it to FFmpeg's STDIN.
    ws.on('message', (msg) => {
      console.log('DATA', msg);
      ffmpeg.stdin.write(msg);
    });

    // If the client disconnects, stop FFmpeg.
    ws.on('close', (e) => {
      ffmpeg.kill('SIGINT');
    });

  });
