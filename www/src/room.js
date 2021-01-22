// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { Component, useEffect, useState, useRef  } from 'react';
//import VideoPlayer from './player';
import Amplify, { Auth } from 'aws-amplify';
import awsmobile from "./aws-exports";
import Table from 'react-bootstrap/Table';

Amplify.configure(awsmobile);


class room extends Component {
  constructor(props) {
    super(props);
    this.state = {
      token: 1,
      stream:React.createRef(),
      gotDevices: React.createRef(),
      videoin: React.createRef(),
      copyItems: [],
      audioin: [],
      audioout:[],
      isConnected:false,
      showCam: false,
      nameCanv: React.createRef(),
      wsRef: React.createRef(),
      mediaRecorder: React.createRef(),
      requestAnimationRef: React.createRef(),
      videoRef: React.createRef(),
      setCameraEnabled: false,
      CAMERA_CONSTRAINTS: {
        audio: true,
        video: true
      },
      rtmpURL: "rtmps://ca538d4d3d92.global-contribute.live-video.net:443/app/",
      streamKey: "sk_us-east-1_gecbHp7v8OJg_FN7Uxsqxud0186yUUCnhqcy4PaxTsR",
      showComponent: true,
    };
    //this.handleURLset = this.handleURLset.bind(this);
  }

  componentDidMount() {
    // getting access to webcam
    const videoRef = this.state
    const video = videoRef.current;
    const constraints = { video: true }
    navigator.mediaDevices
    .getUserMedia({video: true})
    .then(stream => this.videoRef.current.srcObject = stream)
    .catch(console.log);
    this.getCurrentUser()
    //console.log("Did Mount")
  }

  componentWillUnmount() {
  }

getCurrentUser() {
  Auth.currentSession({ bypassCache: true }).then(session => {
    this.setState({
      session,
      token: session.accessToken.jwtToken
    });
  });
};




listCam = async () => {
  // 0 list cam
  
  let copyItems = this.value
  let gotDevice = []
  let videoin = []
  let audioin = []
  let audioout = []
  let camlist = []
  await navigator.mediaDevices.enumerateDevices()
    .then(gotDevices => {
      console.log("list devices", gotDevices);

      gotDevices.forEach(logArrayElements);

      gotDevices.forEach(function(gotDevice) {


        
        //console.log(gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
        //devId = gotDevice.deviceId
        if (gotDevice.kind === 'videoinput'){
          console.log("video", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
          videoin.push(gotDevice.label)
        }
        if (gotDevice.kind === 'audioinput'){
          console.log("audioin", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
          audioin.push(gotDevice.label)
        }
        if (gotDevice.kind === 'audiooutput'){
          console.log("audioout", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
          audioout.push(gotDevice.label)
        }
      });
      
      this.setState({
        videoin,
        audioin,
        audioout,
        copyItems,
        gotDevice
      })
      console.log("check state", this.state);
    })
    .catch(function(err) {
      console.log(err.name + ": " + err.message);
    });
    console.log("check state 2", this.state);
    this.enableCam()
  };


enableCam () {
  console.log("Loop enable cam")
  var constraints = { audio: true, video: { width: 1280, height: 720 } };
  var stream = this.state
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function(mediaStream) {
        var stream = document.querySelector("video");

        stream.srcObject = mediaStream;
        stream.onloadedmetadata = function(e) {
          stream.play();
        };
      })
      .catch(function(err) {
        console.log(err.name + ": " + err.message);
      }); // always check for errors at the end.

    this.setState({
        showCam: true,
        //stream
    })
  
};

handleDevChange = (e) =>{
  console.log(e);
}


handleURLset = (e) =>{
  e.preventDefault();
  const {rtmpURL, streamKey, wsRef, mediaRecorder, isConnected} = this.state;
  console.log("URL", rtmpURL, streamKey);
  this.setState({
    rtmpURL,
    streamKey,
    showComponent: true
  })
  let protocol = window.location.protocol.replace('http', 'ws');
  let server = "//127.0.0.1:3004"
  let wsUrl = `${protocol}//${server}/rtmps/${rtmpURL}${streamKey}`;
  wsRef.current = new WebSocket(wsUrl);
  //var setConnected = {}
  console.log("como esta o wsRef", wsRef)
  wsRef.current.addEventListener('open', function open() {
    console.log("Open!!!") /// set state need
  });



  console.log ("RTMP Values", protocol, wsUrl);
  console.log ("Stream tem value?", this.state.stream);

  let vidSreaming = this.state.stream.current.captureStream(30);
  let audioStream = new MediaStream();

  console.log ("procurando audio tracking", this.state.stream.current)

  // to sem audio // to be fixed 
  /*
  let audioTracks = this.state.stream.current.getAudioTracks();
  audioTracks.forEach(function (track) {
    audioStream.addTrack(track);
  });
  */

  let outputStream = new MediaStream();
  [audioStream, vidSreaming].forEach(function (s) {
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

  // implementar listener de stop

  mediaRecorder.current.start(1000);

  //this.playerShow()
} 

  render() {
    console.log("reder has been called");
    console.log(this.state);
    document.body.style = 'background: #262626;';
    const { token, showCam, videoin, audioin, audioout, stream } = this.state;
    console.log("tem token?", token)
    const { rtmpURL, streamKey }  = this.state;
    if (!showCam) {
      console.log("loadding");
      return (
        <div className="VideoBOX">
          <button type="submit" className="enableCam" onClick={this.listCam}>Enable Cam!</button>
        </div>
      )
    } else{
      console.log("ShowCam", showCam);
      console.log("Tem cameras?", videoin)
      console.log("como ta o stream", stream)
      return (
        
        <div className="App">
        <div className="container fluid" style={{backgroundColor: "#262626"}}>
            <div className="headerPlayer">
              <h1>Simple IVS Streming</h1>
            </div>
                <div className="row">
                <div className="col-md">
                  <form onSubmit={this.handleSubmit} class="form-control-select">
                      <select class="form-control" value={this.state.value} onChange={this.handleDevChange} >
                      <option disabled>Select Camera</option>
                      {videoin.map((videoin) =>
                        <option key={videoin} value={videoin}>{videoin}</option>)}
                      </select>
                      <select class="form-control" value={this.state.value} onChange={this.handleDevChange}>
                      <option disabled>Select Audio In</option>
                      {audioin.map((audioin) =>
                        <option key={audioin} value={audioin}>{audioin}</option>)}
                      </select>
                      <select class="form-control" value={this.state.value} onChange={this.handleDevChange}>
                      <option disabled>Select Audio Out</option>
                      {audioout.map((audioout) =>
                        <option key={audioout} value={audioout}>{audioout}</option>)}
                      </select>
                    </form>
                </div>
              </div>
              <div className="row">
              
                <div className="webcamBOX">
                
                  <video autoPlay={true} ref={stream} id="videoElement" controls></video>
                </div>
        
                
              </div>




            

        
        <div className="player-wrapper"> 
          
        </div>
            <div className="row">
            <div className="col-lg">
            <div className="form-group">
              <form className="form-URL">
                <label className="formLabel">
                  IVS URL:
                      <input 
                        id="rtmpURL" 
                        type="text"
                        width= "100%" 
                        value={this.state.rtmpURL}
                        className="formURL" 
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm"
                        onChange={e => this.setState({ rtmpURL: e.target.value, showComponent: false})}
                        />
                      </label>
                      <label className="formLabel">
                    Stream Key:
                        <input 
                        id="streamKey" 
                        type="text"
                        value={this.state.streamKey}
                        className="formURL" 
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm1"
                        onChange={e => this.setState({ streamKey: e.target.value, showComponent: false})}
                        />
                        </label>
                     
                    <button type="submit" className="formBot" onClick={this.handleURLset}>GoLive!</button>
                </form>
                </div>
              </div>
            </div>
            <div className="DebugBOXger">
              <div className="DebugBOXtitle">
                <a>Info:</a>
              </div>
              <div className="DebugBOX">
              <Table className="DebugTable" variant="dark" responsive="lg" >
                  <tbody wordBreak='break-all'>
                    <tr>
                      <th width={100}>
                        URL:
                      </th>
                      <td>{rtmpURL}</td>
                    </tr>
                    <tr>
                      <th>Playing:</th>
                      <td>True</td>
                    </tr>
                    <tr>
                      <th> Token:</th>
                      <td>{token}</td>
                    </tr>
                  </tbody>
              </Table>
              </div>
            </div>         
            </div>
        </div>
      );
    }
  }
}
export default room;

function logArrayElements(element, index, array) {
  console.log('a[' + index + '] = ' + element)
}

async function getMedia(constraints) {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("here", stream)
  } catch(err) {
    /* handle the error */
  }
}


