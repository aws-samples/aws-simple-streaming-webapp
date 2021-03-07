// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// branch with player

import React, { useRef, useState, useEffect } from 'react';
import './stream.style.scss'
import Amplify, { Auth, API} from 'aws-amplify';
import awsmobile from "../aws-exports";
import VideoPlayer from './player/player';
import offAir from '../img/offair.jpg'

Amplify.configure(awsmobile);

const sleep = (milliseconds) => {
return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function Streampage(props) {

const username = props.username;
const stream = useRef();
const [vDevID, setVDevID] = useState("");
const [aDevID, setADevID] = useState("");
const [devices, setDevices] = useState({videoin:null, audioin:null, audioout:null})
const [status, setStatus] = useState({isConnecting:false, isStreaming:false, isShowPlayer:false})
const [errorMSG, setErrorMSG] = useState(null);
const [debugMSG, setdebugMSG] = useState(null);
const [alertFromServers, setAlertFromServers] = useState(null);
const [wrapServers, setWrapServers] = useState({primaryServer:null, secondaryServer:null})
const wsRef = useRef();
const mediaRecorder = useRef();
const constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
const rtmpURL = props.location.state.rtmpURL
const streamKey = props.location.state.streamKey
const playURL= props.location.state.playURL

useEffect(()=>{
  
  (async function() {
    // C1 - init CAM
    try { 
      //const constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const gotDevices = await navigator.mediaDevices.enumerateDevices()
      handleList(gotDevices, mediaStream);
      
    } catch (e) {
        console.error('Device Error' , e);
        handleError(e);
    }
    getServers()
})();
  console.log('component mounted!')
},[vDevID, aDevID])

// C2 - list Cameras
const handleList = (gotDevices) => {
  console.log("List Cam", gotDevices.length)
  let vidin = [];
  let auin = [];
  let audioOut = [];  
  gotDevices.forEach(function (gotDevice) {
    console.log("retorno do for each")
    let i = 0 
    if (gotDevice.kind === 'audioinput'){
      //console.log("audioin", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
      auin.push({label: gotDevice.label, id: gotDevice.deviceId, len:i++})
    } else if (gotDevice.kind === 'videoinput'){
      //console.log("video", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
      vidin.push({label: gotDevice.label, id: gotDevice.deviceId})
    } else if (gotDevice.kind === 'audiooutput'){
      //console.log("audioout??", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
      audioOut.push({label: gotDevice.label, id: gotDevice.deviceId})
    } else {console.log('Some other kind of source/device: ', gotDevice);}
  })
  console.log("Como esta aqui??", vidin, auin, audioOut)
  setDevices({audioin:auin, videoin:vidin, audioout:audioOut})
  enableCam()
}

//U1 get transcoder configuration
const getServers = () =>  {
  let apiName = "saveIVSparam"
  let path = `/getServers/`;
  API.get(apiName, path).then(servers =>{
    console.log("servers response", servers, servers.Items)
    if (servers.Items.length === 0){
      console.log("No servers")
    } else {
      console.log("There are", servers.Items[0].dns, servers.Items[1].dns)
      setWrapServers({primaryServer:servers.Items[0].dns, secondaryServer:servers.Items[1].dns})
    }
  })
  .catch(error => {
    console.log(error);
  });
}

// U2.1 - in case IVS is not configured
const redirTo = () => {
  console.error("Not Configured or Time out API")
  window.location.assign('/') /// trocar para redir
}

// C3 enable camera 
const enableCam = async () => {
  console.log("Loop enable cam")
  console.log("video ID", vDevID, aDevID)
  //let constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
  console.log("contrainsts", constraints)
  await navigator.mediaDevices.getUserMedia(
    constraints
    ).then(function(mediaStream) {
        console.log("assim ta o media strema", mediaStream);
        window.stream = mediaStream;
        var stream = document.querySelector('video');
        console.log("E o stream??", stream)
        var videoTracks = mediaStream.getVideoTracks();

        
        console.log('Got stream with constraints:', constraints);
        console.log(`Using video device: ${videoTracks[0].label}`);

        //window.stream = stream;
        stream.srcObject = mediaStream;

        console.log("UUUUU", stream)

        stream.onloadedmetadata = async function (e) {
          await stream.play();
        };


      })
      .catch(error =>  {
        console.error("Error in EnCam", error);
        handleError(error);
      }); 
      
      //this.setState({showCam: true})
      //console.log("en cam", this.state.showCam);
};

// C2.1 In case error to enable cam  
const handleError = (error) => {
if (error.name === 'ConstraintNotSatisfiedError') {
  //const constraints = { audio: {autoplay: true, deviceId: aDevID}, video: { width: 1280, height: 720, deviceId: vDevID } };
  const v = constraints.video;
  console.error(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`);
} else if (error.name === 'NotAllowedError') {
  console.error('Permissions have not been granted to use your camera and ' +
    'microphone, you need to allow the page access to your devices in ' +
    'order for the demo to work.');
}
console.error(`getUserMedia error: ${error.name}`, error);
setErrorMSG(error.name);
}

// C5 handle device change
const handleDevChange = event => {
  /// if audio if video 
  event.preventDefault();
  console.log("Device Change block", vDevID, aDevID, constraints)
  console.log(event.target.value)
  console.log(event.target.id)
  if (event.target.id === 'videoin'){
    console.log("set video", event.target.value)
    setVDevID(event.target.value)
    }
  if (event.target.id === 'audioin'){
    console.log("set audio iN", aDevID)
    setADevID(event.target.value) 
  }
  if (event.target.id === 'audioout'){
    console.log("set audio out")
  }
  console.log("check State", props)
  enableCam()
}

// P1 - Open Player windown - future implemtation 
const openPlayer = async (e) => {
  //window.open('/player', '_blank');
  e.preventDefault()
  console.log("e??", e, playURL)
  // falta um set URL aqui 
  setStatus({isShowPlayer:false})
  await sleep(10000)
  setStatus({isShowPlayer:true})
}

// P2 - Player - external
const playChannel = (e) => {
  e.preventDefault();
  this.setState({showPlayer: true})
}

// P3 - Player rendering
const playerShow = () => {
return (
  <div>{<VideoPlayer { ...{
    autoplay: true,
    controls: true,
    width: 640,
    height: 360,
    bigPlayButton: true,
    //token: token,
    cookie: "test",
    sources: [{
      //TEST URL: src: 'http://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_uncage_vanlife_admarker_60sec.m3u8',
      src: playURL,
      type: 'application/x-mpegURL',
    }]
  }}/>}</div>
);
}

//P3.1  - if not on air
const offAirshow = () => {
  return (<div>
    <img
      width= "640"
      height= "360"
      alt="Off Air"
      src={offAir}/>
  </div>)
}

// S2 - Stop streaming to IVS
const stopStreaming = () => {
  if (mediaRecorder.current.state === 'recording') {
    mediaRecorder.current.stop();
    wsRef.current.close();
  }
  setStatus({isConnecting:false, isStreaming:false, isShowPlayer:false})
  setdebugMSG(null)
};

const fallbackServer = (err) => {
  console.log("got SERVERS!", wrapServers.secondaryServer);
  let serverSec = wrapServers.secondaryServer
  let protocol = window.location.protocol.replace('http', 'ws');
  let testserver = "//127.0.0.1:3004"// //d355h0s62btcyd.cloudfront.net
  let wsUrlFal = `${protocol}//${serverSec}/rtmps/${rtmpURL}${streamKey}`;


     // Fallback flow ini
     console.log("Fallback route", err)
     wsRef.current = new WebSocket(wsUrlFal);
     console.log("Trying Server", wsUrlFal)
     

     wsRef.current.addEventListener('open', async function open(data) {
       console.log("Open, Server 2!!!", data) /// set state need
       setStatus({isConnecting:true}) 
       if(data){
         console.log("!@@@@!!!")
         await sleep(25000);
         setStatus({isConnecting:false, isStreaming:true, isShowPlayer:true})
         setAlertFromServers("") 
       }
     });


     wsRef.current.onmessage = evt =>{
       console.log("MSG!!", evt)
       setdebugMSG(evt.data)
     }

     wsRef.current.onerror = err => {
       console.error("Got a error, both servers are out!!!", err, wsRef.current)
       setAlertFromServers("CRITICAL ERROR: Both servers are closed") 
     }
     
     wsRef.current.onclose = e => {
       console.log ("Client Closing Conection")
       stopStreaming()
       console.log(
         "Socket is closed", e.reason)
     }  
      /// End fallback flow

}

//S1 - Start streaming to IVS
const startStreaming = async (e) =>{
    e.preventDefault();
    console.log("got SERVERS!", wrapServers.primaryServer);
    let protocol = window.location.protocol.replace('http', 'ws');
    let localtest = '//127.0.0.1:3004'
    let testserver = "//d355h0s62btcyd.cloudfront.net" // //d355h0s62btcyd.cloudfront.net
    let wsUrl = `${protocol}//${localtest}/rtmps/${rtmpURL}${streamKey}`;

    wsRef.current = new WebSocket(wsUrl)
    console.log("como esta o wsRef", wsRef)

    wsRef.current.onerror = err => {
      setAlertFromServers("WARNING! SERVER 1 - Socket Closed!!!") 
      console.error("Got a error!!!", err, wsRef.current)
      fallbackServer(err) 
    }

    wsRef.current.onclose = e => {
        console.log ("Fallback 1",  e.reason)
    }

    wsRef.current.onmessage = evt =>{s
        //console.log("MSG!!", evt)
        setdebugMSG(evt.data)
    }

    wsRef.current.addEventListener('open', async function open(data) {
      console.log("Open!!!", data)
      setStatus({isConnecting:true})  
      if(data){
        console.log("!@@@@!!!")
        await sleep(25000);
        setStatus({isConnecting:false, isStreaming:true, isShowPlayer:true}) 
      }
    });

    let vidStreaming = stream.current.captureStream(30);
    let outputStream = new MediaStream();
    [vidStreaming].forEach(function (s) {
      s.getTracks().forEach(function (t) {
        outputStream.addTrack(t);
      });
    });
    mediaRecorder.current = new MediaRecorder(outputStream, {
      mimeType: 'video/webm',
      videoBitsPerSecond: 3000000,
    });
    mediaRecorder.current.addEventListener('dataavailable', (e) => {
      wsRef.current.send(e.data);
    });
    mediaRecorder.current.start(1000);
} 

  document.body.style = 'background: #262626;';

  console.log("Check status???", devices.videoin, status);

    
    return devices.videoin ? (
      <div className="App">
      <div className="container-fluid">
        <h1>IVS Simple Streming v2</h1>
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
                    <select id="videoin" class="form-control" onChange={(e => setVDevID( vDevID => e.target.value), handleDevChange)}>
                    <option disabled>Select Camera</option>
                    {devices.videoin.map((videoin) =>
                      <option key={videoin.id} value={videoin.id}>{videoin.label}</option>)}
                    </select>
                    <select id="audioin" class="form-control"  onChange={(e => setADevID( aDevID => e.target.value), handleDevChange)}>
                    <option disabled>Select Audio In</option>
                    {devices.audioin.map((audioin) =>
                      <option key={audioin.id} value={audioin.id}>{audioin.label}</option>)}
                    </select>
                    <select id="audioout" class="form-control"  onChange={handleDevChange}>
                    <option disabled>Select Audio Out</option>
                    {devices.audioout.map((audioout) =>
                      <option key={audioout.id} value={audioout.id}>{audioout.label}</option>)}
                    </select>
                  </form>
              </div>
              <div className="col-lg-6"> 
              
              <form className="form-control-select">
                      <input 
                      id="streamKey" 
                      type="text"
                      value={playURL}
                      className="form-control-play" 
                      />
                      <button type="submit" className="formBotPlay" onClick={openPlayer}>Play</button>
                  </form>
              </div>

            </div>
            <div className="row">
            
              <div className="col-lg-6">
                <div className="webcamBOX">
                  <video autoPlay={true} muted={true} ref={stream} id="videoElement" controls></video>
                </div>
              </div>
              
              <div className="col-lg-6"> 
                {status.isShowPlayer &&(<div className="playercamBOX">
                  {playerShow()}
                </div>
                )}
                {!status.isShowPlayer && (<div className="playercamBOX">
                  {offAirshow()}
                </div>)}
              </div>
              
            </div>
            </div>       
          <div className="row">
          {!status.isStreaming &&(
          <div className="form-group">
            <form className="form-URL">
              <label className="formLabel">
                IVS URL:
                    <input 
                      id="rtmpURL" 
                      type="text"
                      width= "100%" 
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
                    <button type="submit" className="formBot" onClick={startStreaming}>GoLive!</button>
                  </div>
                  )}
                  {status.isConnecting && (
                    <div className="formLabel">
                      <button type="submit" className="formBotConecting">GoingOnAir</button>
                    </div>
                  )}

              </form>
              </div>
              )}
              {status.isStreaming &&(
                <div className="form-group">
                  <button type="submit" className="formBotStop" onClick={stopStreaming}>StopStreaming!</button>
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
                    <td>1=({wrapServers.primaryServer}) 2=({wrapServers.secondaryServer})</td>
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
    ):(<div>loading...</div>)
  
}
export default Streampage;
