// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// transwrap.js http version

/// import block
const http = require("http");
//const fs = require('fs');
const WebSocket = require("ws");
const express = require("express");
const callff = require("child_process");

/// app socket definition
const app = express();
const port = 3004;
const servertype = "HTTP";
const home = "/wwww"; /// for heath check only, you can also use as standalone server, by moving the frontend folder to the home www

// https certificates // Be sure to generate those before running
/*
const newCert =  'cert.pem';
const newKey = 'key.pem'
const certicates = {
  key: fs.readFileSync(newKey),
  cert: fs.readFileSync(newCert)
};
*/

// wrapper server
const transwraper = http.createServer(app).listen(port, () => {
  console.log(`Listening on port: ${port} ${servertype}`);
});

// websocket creation
const wsRef = new WebSocket.Server({ server: transwraper });

app.use((req, res, next) => {
  console.log(`${servertype}:${req.method}:${req.originalUrl}`);
  return next();
});

app.use(express.static(__dirname + home));

// Streaming
wsRef.on("connection", (ws, req) => {
  console.log("Loop 1");
  ws.send("MSG: Connected to server"); /// Send this message to the app frontend
  console.log(`Got connection, URL: ${req.url}`);
  ws.on("message", (evt) => {
    console.log("Event", evt);
    ffmpeg.stdin.write(evt);
  });

  ws.on("error", (err) => {
    console.log("ERROR on websocket", err);
  });

  const rtmpURL = req.url.slice(12);
  console.log(`URL seted is ${rtmpURL}`);

  const codec = req.url.split("/")[2];
  console.log("CODEC", codec);

  if (codec === "h264") {
    console.log("No video transcoding");
    var ffArr = [
      "-i",
      "-",
      "-vcodec",
      "copy",
      "-preset",
      "veryfast",
      "-tune",
      "zerolatency",
      "-acodec",
      "aac",
      "-ar",
      "44100",
      "-b:a",
      "128k",
      "-f",
      "flv",
      rtmpURL,
      "-reconnect",
      "3",
      "-reconnect_at_eof",
      "1",
      "-reconnect_streamed",
      "3",
    ];
  } else {
    console.log("Transcoding true");
    //ffmpeg -re -stream_loop -1 -i $VIDEO_FILEPATH -r 30 -c:v libx264 -pix_fmt yuv420p -profile:v main -preset veryfast -x264opts "nal-hrd=cbr:no-scenecut" -minrate 3000 -maxrate 3000 -g 60 -c:a aac -b:a 160k -ac 2 -ar 44100 -f flv rtmps://$INGEST_ENDPOINT:443/app/$STREAM_KEY

    var ffArr = [
      "-fflags",
      "+genpts",
      "-i",
      "-",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "main",
      "-preset",
      "veryfast",
      "-x264opts",
      "nal-hrd=cbr:no-scenecut",
      "-minrate",
      "3000",
      "-maxrate",
      "3000",
      "-g",
      "60",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-vf",
      "scale=1280:720,format=yuv420p",
      "-profile:v",
      "main",
      "-f",
      "flv",
      rtmpURL,
      "-reconnect",
      "3",
      "-reconnect_at_eof",
      "1",
      "-reconnect_streamed",
      "3",
    ];
  }

  ws.on("close", (evt) => {
    ffmpeg.kill("SIGINT");
    console.log(`Connection Closed: ${evt}`);
  });

  const ffmpeg = callff.spawn("ffmpeg", ffArr);

  ffmpeg.on("close", (code, signal) => {
    console.log(`FFMPEG closed, reason ${code} , ${signal}`);
    ws.send("Closing Socket"); /// message to front end
    ws.terminate();
  });

  ffmpeg.stdin.on("error", (e) => {
    ws.send(e);
    console.log(`FFMPEG ERROR: ${e}`);
    ws.terminate();
  });

  ffmpeg.stderr.on("data", (data) => {
    console.log(`FFMPEG MSG: ${data.toString()}`);
    ws.send(data.toString());
  });
});
