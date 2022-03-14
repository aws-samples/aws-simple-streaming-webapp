import React, { useRef, useState, useEffect } from "react";

import "./home.style.css";

export default function Peer(props) {
  const username = props.username;
  const mediaStream = useRef();
  const mediaDevices = useRef();
  const [devices, setDevices] = useState({
    videoin: null,
    audioin: null,
    audioout: null,
  });
  const [errorMSG, setErrorMSG] = useState(null);
  const [vDevID, setVDevID] = useState("");
  const [aDevID, setADevID] = useState("");
  const constraints = {
    audio: { autoplay: true, deviceId: aDevID },
    video: { width: 1280, height: 720, deviceId: vDevID },
  };
  const localStream = useRef();
  const remoteStream = useRef();
  const remoteVideo = useRef();
  const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1,
  };
  const uuid = Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);

  const peerConnectionConfig = {
    iceServers: [
      { urls: "stun:stun.stunprotocol.org:3478" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };

  const peerPC = useRef();

  const [Caller, isCaller] = useState(true);

  useEffect(() => {
    (async function () {
      // C1 - init CAM
      try {
        //const constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
        mediaStream.current = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        mediaDevices.current = await navigator.mediaDevices.enumerateDevices();
        handleListDevices();
        getCamera();
      } catch (e) {
        console.error("Device Error", e);
        handleError(e);
      }
      //getServers()
    })();
    console.log("component mounted!");
  }, []);

  const handleListDevices = () => {
    console.log(`Devices recived, ${mediaDevices.current}`);
    let vidin = [];
    let auin = [];
    let audioOut = [];
    mediaDevices.current.forEach((mediaDevice) => {
      let i = 0;
      if (mediaDevice.kind === "audioinput") {
        //console.log("audioin", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
        auin.push({
          label: mediaDevice.label,
          id: mediaDevice.deviceId,
          len: i++,
        });
      } else if (mediaDevice.kind === "videoinput") {
        //console.log("video", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
        vidin.push({ label: mediaDevice.label, id: mediaDevice.deviceId });
      } else if (mediaDevice.kind === "audiooutput") {
        //console.log("audioout??", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
        audioOut.push({ label: mediaDevice.label, id: mediaDevice.deviceId });
      } else {
        console.log("Some other kind of source/device: ", mediaDevice);
      }
    });
    setDevices({ audioin: auin, videoin: vidin, audioout: audioOut });
    console.log("Devices has been registed", devices);
  };

  const handleError = (error) => {
    if (error.name === "ConstraintNotSatisfiedError") {
      //const constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
      const v = constraints.video;
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

  //get access to the local camera
  const getCamera = async () => {
    console.log("GET Local Camera");
    window.localStream = mediaStream.current;
    var videoTracks = mediaStream.current.getVideoTracks();

    console.log("Video Tracks?", videoTracks);
    localStream.current.srcObject = mediaStream.current;

    localStream.current.onloadedmetadata = async function (e) {
      await localStream.current.play();
    };
  };

  const startRemote = async () => {
    peerPC.current = new RTCPeerConnection(peerConnectionConfig);
    peerPC.current.onicecandidate = gotIceCandidate;
    peerPC.current.ontrack = gotRemoteStream;
    peerPC.current.addStream(mediaStream.current);
    if (Caller) {
      peerPC.current.createOffer().then(createdDescription).catch(errorHandler);
    }
  };

  const gotRemoteStream = (event) => {
    console.log("got remote stream", event);
    remoteStream.current.srcObject = event.streams[0];
  };

  const createdDescription = (description) => {
    console.log("got description");

    peerPC.current
      .setLocalDescription(description)
      .then(function () {
        serverConnection.send(
          JSON.stringify({ sdp: peerPC.current.localDescription, uuid: uuid })
        );
      })
      .catch(errorHandler);
  };

  const gotMessageFromServer = (message) => {
    if (!peerPC.current) {
      isCaller(false);
      startRemote;
    }
    var signal = JSON.parse(message.data);
    console.log(signal);

    // Ignore messages from ourself
    if (signal.uuid == uuid) return;

    if (signal.sdp) {
      peerPC.current
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(function () {
          // Only create answers in response to offers
          if (signal.sdp.type == "offer") {
            peerPC.current
              .createAnswer()
              .then(createdDescription)
              .catch(errorHandler);
          }
        })
        .catch(errorHandler);
    } else if (signal.ice) {
      peerPC.current
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch(errorHandler);
    }
  };

  const gotIceCandidate = (event) => {
    console.log("gotIce candidate", event);

    var serverConnection = new WebSocket(
      "ws://" + window.location.hostname + ":3004"
    );
    serverConnection.onmessage = gotMessageFromServer;

    if (event.candidate != null) {
      serverConnection.send(
        JSON.stringify({ ice: event.candidate, uuid: uuid })
      );
    }
  };

  const errorHandler = (error) => {
    console.log(error);
  };

  return (
    <div>
      <div className="webcamBOX">
        <video
          autoPlay={true}
          muted={true}
          ref={localStream}
          id="videoElement"
          controls
        ></video>
      </div>
      <button type="submit" className="formBotStop" onClick={startRemote}>
        Call
      </button>
    </div>
  );
}
