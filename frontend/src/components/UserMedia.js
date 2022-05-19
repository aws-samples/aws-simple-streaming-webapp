// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useRef, useState } from "react";
import "./styles/UserMedia.style.css";

export default function HomePage(props) {
  const { onReady } = props;
  const mediaStream = useRef();
  const mediaDevices = useRef();
  const localStream = useRef();
  const canvasStream = useRef();
  const animationRef = useRef();
  const [vDevID, setVDevID] = useState("");
  const [aDevID, setADevID] = useState("");
  const [devices, setDevices] = useState({
    videoin: null,
    audioin: null,
    audioout: null,
  });
  const constraints = {
    audio: { autoplay: true, deviceId: aDevID, sampleRate: 44100 },
    video: { width: 1280, height: 720, deviceId: vDevID },
  };
  const [errorMSG, setErrorMSG] = useState(null);

  useEffect(() => {
    (async function () {
      try {
        mediaStream.current = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        mediaDevices.current = await navigator.mediaDevices.enumerateDevices();
        deviceList();
        //getCamera();
      } catch (e) {
        console.error("Device Error", e);
        handleError(e);
      }
    })();
  }, [vDevID, aDevID]);

  useEffect(() => {
    window.addEventListener("resize", onResize);
  }, [localStream.current]);

  function onResize(e) {
    if (
      canvasStream.current.width !== localStream.current.clientHeight ||
      canvasStream.current.width !== localStream.current.clientWidth
    ) {
      console.log("Fixing video sizing");
      canvasStream.current.width = localStream.current.clientHeight;
      canvasStream.current.width = localStream.current.clientWidth;
    }

    requestAnimationFrame(refreshCanvas);
  }

  /*###################################   Function List Devices   ###################################*/
  function deviceList() {
    console.log("List Cameras", mediaDevices.current.length);
    let vidin = [];
    let auin = [];
    let audioOut = [];
    mediaDevices.current.forEach(function (gotDevice) {
      let i = 0;
      if (gotDevice.kind === "audioinput") {
        auin.push({ label: gotDevice.label, id: gotDevice.deviceId, len: i++ });
      } else if (gotDevice.kind === "videoinput") {
        vidin.push({ label: gotDevice.label, id: gotDevice.deviceId });
      } else if (gotDevice.kind === "audiooutput") {
        audioOut.push({ label: gotDevice.label, id: gotDevice.deviceId });
      } else {
        console.log("Some other kind of source/device: ", gotDevice);
      }
    });
    setDevices({ audioin: auin, videoin: vidin, audioout: audioOut });
    getCamera();
  }

  /*###################################   Handle Device Change   ###################################*/
  const handleDevChange = (event) => {
    event.preventDefault();
    console.log("Device Change block", vDevID, aDevID, constraints);
    console.log(event.target.value, event.target.id);
    if (event.target.id === "videoin") {
      console.log("set video", event.target.value);
      setVDevID(event.target.value);
    }
    if (event.target.id === "audioin") {
      console.log("set audio iN", aDevID);
      setADevID(event.target.value);
    }
    if (event.target.id === "audioout") {
      console.log("set audio out");
    }
    getCamera();
  };

  /*###################################   Function Display Camera   ###################################*/
  const getCamera = async () => {
    console.log("GET Local Camera");
    window.localStream = mediaStream.current;
    localStream.current.srcObject = mediaStream.current;
    localStream.current.onloadedmetadata = async function (e) {
      await localStream.current.play();
    };

    canvasStream.current.height = localStream.current.clientHeight;
    canvasStream.current.width = localStream.current.clientWidth;

    let audioTracks = mediaStream.current.getAudioTracks();
    requestAnimationFrame(refreshCanvas);
    onReady && onReady(localStream.current, canvasStream.current, audioTracks);
  };

  //Add to canvas
  const refreshCanvas = (e) => {
    var element = document.getElementById("video");
    if (element) {
      const ctx = canvasStream.current.getContext("2d");

      let cW = canvasStream.current.width;
      let cH = canvasStream.current.height;

      draw(localStream.current, cW, cH);

      function draw(video, width, height) {
        ctx.drawImage(video, 0, 0, width, height); // canvas has a distort
      }
      requestAnimationFrame(refreshCanvas);
    }
  };

  /*###################################   Function Handle Cam Error   ###################################*/
  const handleError = (error) => {
    if (error.name === "ConstraintNotSatisfiedError") {
      let v = constraints.video;
      console.error(
        `The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`
      );
    } else if (error.name === "NotAllowedError") {
      console.error(
        "Permissions have not been granted to use your camera and " +
          "microphone, you need to allow the page access to your devices in " +
          "order for the demo to work."
      );
    }
    console.error(`getUserMedia error: ${error.name}`, error);
    setErrorMSG(error.name);
  };

  return devices.videoin ? (
    <div>
      <div className="container-fluid">
        <form className="form-control-select">
          <select
            id="videoin"
            className="form-control"
            onChange={
              ((e) => setVDevID((vDevID) => e.target.value), handleDevChange)
            }
          >
            <option disabled>Select Camera</option>
            {devices.videoin.map((videoin) => (
              <option key={videoin.id} value={videoin.id}>
                {videoin.label}
              </option>
            ))}
          </select>
          <select
            id="audioin"
            className="form-control"
            onChange={
              ((e) => setADevID((aDevID) => e.target.value), handleDevChange)
            }
          >
            <option disabled>Select Audio In</option>
            {devices.audioin.map((audioin) => (
              <option key={audioin.id} value={audioin.id}>
                {audioin.label}
              </option>
            ))}
          </select>
          <select id="audioout" class="form-control" onChange={handleDevChange}>
            <option disabled>Select Audio Out</option>
            {devices.audioout.map((audioout) => (
              <option key={audioout.id} value={audioout.id}>
                {audioout.label}
              </option>
            ))}
          </select>
        </form>
      </div>
      <div className="video-container">
        <video
          autoPlay={true}
          muted={true}
          ref={localStream}
          id="video"
          controls
          className="video"
        ></video>
        <canvas className="canvas" ref={canvasStream} id="canvas"></canvas>
      </div>
    </div>
  ) : (
    <div>loading...</div>
  );
}
