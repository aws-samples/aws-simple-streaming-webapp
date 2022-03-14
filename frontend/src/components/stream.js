// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// Authors: "Marlon P Campos,Osmar Bento da Silva Junior"
import React, { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./stream.style.css";
import { API } from "@aws-amplify/api";
import VideoPlayer from "./player/";
import OffAir from "./OffAir";

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

function Streampage(props) {
  const location = useLocation();
  // Player Consts
  const playURL = location.state.apiResult.playURL;
  const playerRef = useRef();
  const videoJsOptions = {
    autoplay: "muted",
    controls: true,
    responsive: true,
    fluid: true,
    sources: [
      {
        src: playURL,
        type: "application/x-mpegURL",
      },
    ],
  };

  //Camera Consts
  const mediaStream = useRef();
  const localStream = useRef(); // prepare for peer contribution
  const mediaDevices = useRef();
  const [vDevID, setVDevID] = useState("");
  const [aDevID, setADevID] = useState("");
  const [devices, setDevices] = useState({
    videoin: null,
    audioin: null,
    audioout: null,
  });
  const [status, setStatus] = useState({
    isConnecting: false,
    isStreaming: false,
    isShowPlayer: false,
  });
  const [errorMSG, setErrorMSG] = useState(null);
  const [debugMSG, setdebugMSG] = useState(null);
  const [alertFromServers, setAlertFromServers] = useState(null);
  const [wrapServers, setWrapServers] = useState({
    primaryServer: null,
    secondaryServer: null,
  });
  const wsRef = useRef();
  const mediaRecorder = useRef();
  const constraints = {
    audio: { autoplay: true, deviceId: aDevID, sampleRate: 44100 },
    video: { width: 1280, height: 720, deviceId: vDevID },
  };

  const rtmpURL = location.state.apiResult.rtmpURL;
  const streamKey = location.state.apiResult.streamKey;
  const [socketOpen, setSocketOpen] = useState(true);

  /* 
###################################   Init useEffect   ################################### 
*/
  useEffect(() => {
    (async function () {
      try {
        mediaStream.current = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        mediaDevices.current = await navigator.mediaDevices.enumerateDevices();
        handleList();
        getCamera();
      } catch (e) {
        console.error("Device Error", e);
        handleError(e);
      }
    })();
    console.log("component mounted!");
  }, [vDevID, aDevID]);

  useEffect(() => {
    (async function () {});
    getServers();
  }, []);

  /* 
###################################   API GET Servers   ################################### 
*/
  const getServers = () => {
    let apiName = "saveIVSparam";
    let path = `/getServers/`;
    API.get(apiName, path)
      .then((response) => {
        if (response.Items.length === 0) {
          console.err("Server is not defined");
        } else {
          setWrapServers({
            primaryServer: response.Items[0].dns,
            secondaryServer: response.Items[1].dns,
          });
          let server = response.Items[0].dns;
          healthCheck(server);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  /* 
###################################   Function List Devices   ################################### 
*/
  const handleList = () => {
    console.log("List Cam", mediaDevices.current.length);
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
  };

  // websocket client definition
  const webSocketConnect = (server, action) => {
    if (window.location.protocol == "http:") {
      var protocol = window.location.protocol.replace("http", "ws");
    } else {
      var protocol = window.location.protocol.replace("https", "wss");
    }

    let wsUrl = `${protocol}//${server}/rtmps/${rtmpURL}${streamKey}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onerror = (err) => {
      console.error("Server not available", err);
    };
    // onclose sub-function, please not, Fargate container takes a few minutes to start at the deplyment
    wsRef.current.onclose = (e) => {
      console.log("It's Closed", server, e.code, e);
      if (e.code == 1006) {
        console.log("timeout");
        setSocketOpen(false);
      }
      if (e.code == 1015) {
        console.log("tls error");
        setSocketOpen(false);
      }
    };

    wsRef.current.addEventListener("open", async function open(data) {
      console.log("Open!!!", data);
      if (action === "healthcheck") {
        setSocketOpen(true);
      } else {
        setStatus({ isConnecting: true });
        if (data) {
          await sleep(25000);
          setStatus({
            isConnecting: false,
            isStreaming: true,
            isShowPlayer: true,
          });
        }
      }
    });

    wsRef.current.onmessage = (evt) => {
      setdebugMSG(evt.data);
    };
  };

  /* 
###################################   Function Health Check   ################################### 
*/
  const healthCheck = (server) => {
    webSocketConnect(server, "healthcheck");
  };

  /* 
###################################   Function Display Camera   ################################### 
*/

  const getCamera = async () => {
    console.log("GET Local Camera");
    window.localStream = mediaStream.current;
    localStream.current.srcObject = mediaStream.current;
    localStream.current.onloadedmetadata = async function (e) {
      await localStream.current.play();
    };
  };

  /* 
###################################   Function Handle Cam Error   ################################### 
*/
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

  // C5 handle device change
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

  // P1 - Player rendering
  const handlePlayerReady = (player) => {
    playerRef.current = player;

    player.on("waiting", () => {
      console.log("player is waiting");
    });

    player.on("dispose", () => {
      console.log("player will dispose");
    });

    player.on("playing", () => {
      console.log("player playing");
      refreshCanvas();
    });
  };

  // S2 - Stop streaming to IVS
  const stopStreaming = () => {
    if (mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
      wsRef.current.close();
    }
    setStatus({ isConnecting: false, isStreaming: false, isShowPlayer: false });
    setdebugMSG(null);
  };

  const fallbackServer = (err) => {
    console.log("got SERVERS!", wrapServers.secondaryServer);
    let server = wrapServers.secondaryServer;
    console.log("Fallback route", err);
    webSocketConnect(server, "secondary");
  };

  //S1 - Start streaming to IVS
  const startStreaming = async (e) => {
    e.preventDefault();
    console.log("got SERVERS!", wrapServers.primaryServer);
    let server = wrapServers.primaryServer;

    webSocketConnect(server, "primary");

    let vidStreaming = localStream.current.captureStream(30);
    let outputStream = new MediaStream();
    [vidStreaming].forEach(function (s) {
      s.getTracks().forEach(function (t) {
        outputStream.addTrack(t);
      });
    });
    mediaRecorder.current = new MediaRecorder(outputStream, {
      mimeType: "video/webm",
      videoBitsPerSecond: 3000000,
    });
    mediaRecorder.current.addEventListener("dataavailable", (e) => {
      wsRef.current.send(e.data);
    });
    mediaRecorder.current.start(1000);
  };

  return devices.videoin ? (
    <div className="App">
      <div className="container-fluid">
        <h1>IVS Simple Streaming</h1>
        {errorMSG && (
          <div className="errorMSG">
            <p>Please enable your Camera, check browser Permissions.</p>
            <p>Error: {errorMSG}</p>
          </div>
        )}
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-6">
              <form class="form-control-select">
                <select
                  id="videoin"
                  class="form-control"
                  onChange={
                    ((e) => setVDevID((vDevID) => e.target.value),
                    handleDevChange)
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
                  class="form-control"
                  onChange={
                    ((e) => setADevID((aDevID) => e.target.value),
                    handleDevChange)
                  }
                >
                  <option disabled>Select Audio In</option>
                  {devices.audioin.map((audioin) => (
                    <option key={audioin.id} value={audioin.id}>
                      {audioin.label}
                    </option>
                  ))}
                </select>
                <select
                  id="audioout"
                  class="form-control"
                  onChange={handleDevChange}
                >
                  <option disabled>Select Audio Out</option>
                  {devices.audioout.map((audioout) => (
                    <option key={audioout.id} value={audioout.id}>
                      {audioout.label}
                    </option>
                  ))}
                </select>
              </form>
            </div>
            <div className="col-lg-6">
              <form className="form-control-select">
                <input
                  id="streamKey"
                  type="text"
                  value={playURL}
                  disabled
                  className="form-control-play"
                />
              </form>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-6">
              <div className="webcamBOX">
                <video
                  autoPlay={true}
                  muted={true}
                  ref={localStream}
                  id="videoElement"
                  controls
                ></video>
              </div>
            </div>
            <div className="col-lg-6">
              {status.isShowPlayer && (
                <div className="videoPlayer">
                  <VideoPlayer
                    id="videoPlayer"
                    options={videoJsOptions}
                    onReady={handlePlayerReady}
                  />
                </div>
              )}
              {!status.isShowPlayer && (
                <div className="playercamBOX">
                  <OffAir />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="row">
          {!socketOpen && (
            <div className="enCert">
              <div className="row">
                <h5>
                  Socket closed! If backend recently deployed, please wait a few
                  minutes or check ECS task status
                </h5>
              </div>
              <div className="row">
                <br />
                <div className="socketLoading"></div>
              </div>
            </div>
          )}

          {socketOpen && !status.isStreaming && (
            <div className="form-group">
              <form className="form-URL">
                <label className="formLabel">
                  Channel URL:
                  <input
                    id="rtmpURL"
                    type="text"
                    width="100%"
                    value={rtmpURL}
                    className="formURL"
                    aria-label="Sizing example input"
                    aria-describedby="inputGroup-sizing-sm"
                  />
                </label>
                <label className="formLabel">
                  Stream Key:
                  <input
                    id="streamKey"
                    type="password"
                    value={streamKey}
                    className="formURL"
                    aria-label="Sizing example input"
                    aria-describedby="inputGroup-sizing-sm1"
                  />
                </label>
                {!status.isConnecting && (
                  <div className="formLabel">
                    <button
                      type="submit"
                      className="formBot"
                      onClick={startStreaming}
                    >
                      GoLive!
                    </button>
                  </div>
                )}
                {status.isConnecting && (
                  <div className="formLabel">
                    <button type="submit" className="formBotConecting">
                      GoingOnAir
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
          {status.isStreaming && (
            <div className="form-group">
              <button
                type="submit"
                className="formBotStop"
                onClick={stopStreaming}
              >
                StopStreaming!
              </button>
            </div>
          )}
        </div>
        <div className="alertFromServers">{alertFromServers}</div>
        <div className="DebugBOXger">
          <div className="DebugBOXtitle">
            <a>Info:</a>
          </div>
          <div className="DebugBOX">
            <table className="DebugTable">
              <tbody>
                <tr>
                  <th width={100}>Play URL:</th>
                  <td>{playURL}</td>
                </tr>
                <tr>
                  <th>isLive:</th>
                  <td>{String(status.isStreaming)}</td>
                </tr>
                <tr>
                  <th>Servers:</th>
                  <td>
                    1=({wrapServers.primaryServer}) 2=(
                    {wrapServers.secondaryServer})
                  </td>
                </tr>
                <tr>
                  <th>Debug MSG:</th>
                  <td>{String(debugMSG)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div>loading...</div>
  );
}
export default Streampage;
