// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useRef } from "react";
import VideoPlayer from "./player/";
import "./styles/PlayerView.style.css";

export default function PlayerView() {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  const playerRef = useRef(null);

  const videoURL = params.url;
  console.log(videoURL);

  const videoJsOptions = {
    autoplay: "muted", //mute audio when page loads, but auto play video
    controls: true,
    responsive: true,
    fluid: true,
    width: 896,
    height: 504,
    sources: [
      {
        src: videoURL,
        type: "application/x-mpegURL",
      },
    ],
  };

  const handlePlayerReady = (player) => {
    player.on("waiting", () => {
      console.log("player is waiting");
    });

    player.on("dispose", () => {
      console.log("player will dispose");
    });

    player.on("playing", () => {
      console.log("player playing");
      addDebugLine(Date.now(), "Player playing");
    });

    player.on("error", (err) => {
      console.log("Play Error", err);
      addDebugLine(Date.now(), `Player ${err.type} ${err.target.innerText}`);
    });

    playerRef.current = player;
  };

  function addDebugLine(metadataTime, metadataText) {
    const domString = `
          <span className="debug-data__time">${metadataTime}</span>
          <span className="debug-data__value">${metadataText}</span>`.trim();

    const dataLine = document.createElement("div");
    dataLine.classList.add("class", "data-line");
    dataLine.innerHTML = domString;

    const debugData = document.querySelector(".debug-data");
    debugData.appendChild(dataLine);
  }

  return (
    <div className="PlayerView">
      <div className="container">
        <h1>Video Player</h1>
        <div className="videoborder">
          <VideoPlayer
            className="videoplayer"
            options={videoJsOptions}
            onReady={handlePlayerReady}
          />
        </div>
        <div className="debug-container">
          <div className="debug-data"></div>
        </div>
      </div>
    </div>
  );
}
