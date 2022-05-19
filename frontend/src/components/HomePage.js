// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect, useRef } from "react";
import UserMedia from "./UserMedia";
import StreamForm from "./StreamForm"; // add lazy load
import { API } from "@aws-amplify/api";

import "./styles/HomePage.style.css";

export default function HomePage(props) {
  const username = props.username;
  const mediaRecorder = useRef();
  const canvasRef = useRef();
  const audioRef = useRef();
  const [streamParams, setStreamParams] = useState({ url: "", key: "" });
  const [streaming, setStreaming] = useState(false);

  const [wrapServers, setWrapServers] = useState("");
  const wsRef = useRef();
  const btnPlayer = document.querySelector("#openplayer");

  useEffect(() => {
    (async function () {
      let apiName = "saveIVSparam";
      let path = `/getServers/`;
      await API.get(apiName, path)
        .then((response) => {
          if (response.Items.length === 0) {
            console.err("Server is not defined");
          } else {
            console.log("SERFERR", response.Items[0].dns);
            setWrapServers(response.Items[0].dns);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    })();
  }, [streaming]);

  function handleFormReady(url, key, playurl) {
    console.log("eeeeee", url, key);
    setStreamParams({ url: url, key: key });
    btnPlayer.addEventListener("click", () => openPlayer(playurl));
  }

  function openPlayer(url) {
    console.log(url);
    window.open(`/PlayerView?url=${url}`, "_blank");
  }

  async function handleCameraReady(video, canvasVideo, audio) {
    canvasRef.current = canvasVideo;
    audioRef.current = audio;
  }

  const startStream = async (e) => {
    e.preventDefault();
    if (!wsRef.current)
      await socketConnect(wrapServers, streamParams.url, streamParams.key);

    const videoStreaming = canvasRef.current.captureStream(30);
    const audioStreaming = new MediaStream();

    audioRef.current.forEach(function (track) {
      console.log("track", track);
      audioStreaming.addTrack(track);
    });

    console.log("audioStreaming", audioStreaming);
    const outputStream = new MediaStream();
    [audioStreaming, videoStreaming].forEach(function (s) {
      s.getTracks().forEach(function (t) {
        outputStream.addTrack(t);
      });
    });

    mediaRecorder.current = new MediaRecorder(outputStream, {
      mimeType: "video/webm;codecs=h264", // attempt to improve cross browser / platform support with h264
      videoBitsPerSecond: 3000000,
    });
    console.log("MR", mediaRecorder);

    mediaRecorder.current.addEventListener("dataavailable", (e) => {
      console.log("data!!!", e);
      wsRef.current.send(e.data);
    });
    mediaRecorder.current.start(1000);
  };

  function stopStreaming(e) {
    mediaRecorder.current.stop();
    setStreaming(false);
  }

  async function socketConnect(server, rtmpURL, streamKey) {
    let testServer = "127.0.0.1:3004";
    console.log("socketConnect");
    if (window.location.protocol == "http:") {
      var protocol = window.location.protocol.replace("http", "ws");
    } else {
      var protocol = window.location.protocol.replace("https", "wss");
    }

    let wsUrl = `${protocol}//${testServer}/rtmps/${rtmpURL}${streamKey}`;
    console.log("URL", wsUrl);
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onerror = (err) => {
      console.error("Server not available", err);
      stopStreaming();
      addDebugLine(Date.now(), `Error connecting to socket`);
      return;
    };
    // onclose sub-function, please note::, Fargate container takes a few minutes to start at the deployment
    wsRef.current.onclose = (e) => {
      console.log("It's Closed", server, e.code, e);
      if (e.code == 1006) {
        console.log("timeout");
        wsRef.current = null;
      }
      if (e.code == 1015) {
        console.log("tls error");
        wsRef.current = null;
      }
      addDebugLine(Date.now(), `Error on connecting to socket ${e.code}`);
      setStreaming(false);
      stopStreaming();
      return;
    };

    //wsRef.current.addEventListener("open", async function open(data) {
    //  console.log("Open!!!!!", data);
    //});

    wsRef.current.onmessage = (evt) => {
      addDebugLine(Date.now(), evt.data);
    };
  }

  function addDebugLine(metadataTime, metadataText) {
    const domString = `
          <span class="debug-data__time">${metadataTime}</span>
          <span class="debug-data__value">${metadataText}</span>`.trim();

    const dataLine = document.createElement("div");
    dataLine.classList.add("class", "data-line");
    dataLine.innerHTML = domString;

    const debugData = document.querySelector(".debug-data");
    debugData.appendChild(dataLine);
  }

  /*###################################   WebSocket Client   ###################################*/
  return wrapServers ? (
    <div className="App">
      <div id="UserMedia" className="container">
        {streamParams.key && (
          <div className="stream-container">
            <div className="controls-container">
              <button
                id="golive"
                className={streaming ? "rounded-btn stop" : "rounded-btn"}
                onClick={(e) => {
                  streaming
                    ? stopStreaming(e) || setStreaming(false)
                    : startStream(e) && setStreaming(true);
                }}
              >
                {streaming ? "Stop" : "Go Live"}
              </button>
            </div>
            <UserMedia onReady={handleCameraReady} streaming={streaming} />
          </div>
        )}
      </div>
      <div id="UserMedia" className="container">
        <StreamForm onReady={handleFormReady} username={username} />
      </div>
      <div className="debug-container">
        <div className="debug-data"></div>
      </div>
    </div>
  ) : (
    <div>Loading...</div>
  );
}
