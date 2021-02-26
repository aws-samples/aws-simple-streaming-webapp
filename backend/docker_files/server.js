/// int version
// code based on https://github.com/fbsamples/Canvas-Streaming-Example


const child_process = require('child_process'); // To be used later for running FFmpeg
const express = require('express');
const http = require('https');
const fs = require('fs')
const WebSocketServer = require('ws').Server;

const app = express();
const port = 443

const options = {
  key: fs.readFileSync('/opt/ivs-simple-webrtc/key.pem'),
  cert: fs.readFileSync('/opt/ivs-simple-webrtc/cert.pem')
};

const server = http.createServer(options, app).listen(port, () => {
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
      // Facebook requires an audio track, so we create a silent one here.
      // Remove this line, as well as `-shortest`, if you send audio from the browser.
      '-f', 'lavfi', '-i', 'anullsrc',

      // FFmpeg will read input video from STDIN
      '-i', '-',

      // Because we're using a generated audio source which never ends,
      // specify that we'll stop at end of other input.  Remove this line if you
      // send audio from the browser.
      '-shortest',

      // If we're encoding H.264 in-browser, we can set the video codec to 'copy'
      // so that we don't waste any CPU and quality with unnecessary transcoding.
      // If the browser doesn't support H.264, set the video codec to 'libx264'
      // or similar to transcode it to H.264 here on the server.
      '-vcodec', 'copy',

      // AAC audio is required for Facebook Live.  No browser currently supports
      // encoding AAC, so we must transcode the audio to AAC here on the server.
      '-acodec', 'aac',

      // FLV is the container format used in conjunction with RTMP
      '-f', 'flv',

      // The output RTMP URL.
      // For debugging, you could set this to a filename like 'test.flv', and play
      // the resulting file with VLC.  Please also read the security considerations
      // later on in this tutorial.
      rtmpUrl
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
