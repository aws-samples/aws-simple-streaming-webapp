// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

function VideoJS(props) {
  const videoRef = React.useRef(null);
  const playerRef = React.useRef(null);
  const { options, onReady, onMetadata } = props;

  React.useEffect(() => {
    // make sure Video.js player is only initialized once
    if (!playerRef.current) {
      const videoElement = videoRef.current;

      if (!videoElement) return;

      // ini video js
      const player = (playerRef.current = videojs(videoElement, options, () => {
        console.log("player is ready");
        console.log("video Element", videoElement);

        onReady && onReady(player);

        videoElement.textTracks.addEventListener(
          "addtrack",
          function (addTrackEvent) {
            var track = addTrackEvent.track;
            track.mode = "hidden";

            console.log("Track", track);

            track.addEventListener("cuechange", cueChangeEvent);
          }
        );

        console.log("Tem esse met", videoElement.textTracks);

        //onPlaying && onPlaying(player)
      }));

      const cueChangeEvent = (evt) => {
        console.log("I have something from player", evt);
      };
    } else {
      // you can update player here [update player through props]
      const player = playerRef.current;

      // player.autoplay(options.autoplay);
      // player.src(options.sources);
    }
  }, [options]);

  // Dispose the Video.js player when the functional component unmounts
  React.useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player>
      <video
        id="videojs"
        ref={videoRef}
        className="video-js vjs-big-play-centered"
      />
    </div>
  );
}

export default VideoJS;
