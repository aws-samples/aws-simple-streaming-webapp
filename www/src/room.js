// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// branch with player

import React, { Component } from 'react';
import Amplify, { Auth, API, selectInput } from 'aws-amplify';
import awsmobile from "./aws-exports";
import VideoPlayer from './player';
import offAir from './offair.jpg'

Amplify.configure(awsmobile);

const constraints = window.constraints = {
  audio: false,
  video: { width: 1280, height: 720 }
};

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

class room extends Component {
  constructor(props) {
    super(props);
    this.vidRef = React.createRef();
    this.state = {
      username: "",
      video:React.createRef(),
      stream: React.createRef(),
      gotDevices: React.createRef(),
      videoin: [{
        label: "",
        id: ""
      }],
      audioin: [{
        label: "",
        id: ""
      }],
      audioout: [{
        label: "",
        id: ""
      }],
      errorMSG: "",
      apiResult: true,
      isConnected: false,
      isStreaming: false,
      showPlayer: false,
      showCam: false,
      nameCanv: React.createRef(),
      wsRef: React.createRef(),
      mediaRecorder: React.createRef(),
      requestAnimationRef: React.createRef(),
      showencam: true,
      setCameraEnabled: false,
      vDevID: '', //replace with def 
      aDevID: '',
      CAMERA_CONSTRAINTS: {
        audio: true,
        video: true
      },
      rtmpURL: null,
      streamKey: {},
      playURL: {},
      showComponent: true,
    };
    this.getCurrentUser()
    this.initFunc()
  }

  componentDidMount() {
    this.start()
  }
  
  // C1 - init CAM
  initFunc = async () =>{
    //get camera stated and enum devices
    try{
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const gotDevices = await navigator.mediaDevices.enumerateDevices()
      this.handleList(gotDevices, mediaStream);
      //
    } catch (error) {
      this.handleError(error);
    }
  }
  
  // C2 - list Cameras
  handleList (gotDevices) {
    let videoin = []
    let audioin = []
    let audioout = []
    gotDevices.forEach(function(gotDevice) {
      if (gotDevice.kind === 'videoinput'){
        //console.log("video", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
        videoin.push({label: gotDevice.label, id: gotDevice.deviceId})
      }
      if (gotDevice.kind === 'audioinput'){
        //console.log("audioin", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
        audioin.push({label: gotDevice.label, id: gotDevice.deviceId})
      }
      if (gotDevice.kind === 'audiooutput'){
        //console.log("audioout", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
        audioout.push({label: gotDevice.label, id: gotDevice.deviceId})
      }
    })
  
    this.state.videoin = videoin
    this.state.audioin = audioin
    this.state.audioout = audioout 
  }

  // U1 - get user name
  getCurrentUser() {
    Auth.currentAuthenticatedUser({ bypassCache: true }).then(user => {
      const username = user.username
      this.getStream(username)
      });
  };
        
  // U2 - get IVS param
  getStream(username) {
    console.log("tem valor aqui??", username)
    let apiName = "saveIVSparam"
    let path = `/putitens/${username}`;
    API.get(apiName, path)
    .then(ivsparams => {
      console.log(ivsparams.length)
      if (ivsparams.length === 1) {
        this.setState({
          rtmpURL: ivsparams[0].rtmpURL,
          streamKey: ivsparams[0].streamKey,
          playURL: ivsparams[0].playURL,
          apiResult: true,
        })
      } else {
        this.redirTo() // in case IVS is not configured
      }
    })
    .catch(error => {
      console.log(error);
    });
  }

// U3 - incase IVS is not configured
redirTo (){
  console.error("Not Configured or Time out API")
  window.location.assign('/admin') 
}

// C3 enable camera 
enableCam = async () => {
  console.log("Loop enable cam")
  console.log("video ID", this.state.vDevID)
  const constraints = { audio: {autoplay: true, deviceId: this.state.aDevID}, video: { width: 1280, height: 720, deviceId: this.state.vDevID } };
  console.log("contrainsts", constraints)
  var stream = this.state
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
        this.handleError(error);
      }); 
      
      //this.setState({showCam: true})
      console.log("en cam", this.state.showCam);
};

 // C2.1 In case error to enable cam  
 handleError(error) {
  if (error.name === 'ConstraintNotSatisfiedError') {
    const v = constraints.video;
    console.error(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`);
  } else if (error.name === 'NotAllowedError') {
    console.error('Permissions have not been granted to use your camera and ' +
      'microphone, you need to allow the page access to your devices in ' +
      'order for the demo to work.');
  }
  console.error(`getUserMedia error: ${error.name}`, error);
  this.setState({errorMSG: error.name});
}

//0 - list cam and update cams 
listCam = async () => {
  let copyItems = this.value
  let gotDevice = []
  let videoin = []
  let audioin = []
  let audioout = []
  await navigator.mediaDevices.enumerateDevices()
    .then(gotDevices => {
      gotDevices.forEach(function(gotDevice) {
        if (gotDevice.kind === 'videoinput'){
          //console.log("video", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
          videoin.push({label: gotDevice.label, id: gotDevice.deviceId})
          console.log("como esta video in!!!!!!", videoin)
        }
        if (gotDevice.kind === 'audioinput'){
          //console.log("audioin", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
          audioin.push({label: gotDevice.label, id: gotDevice.deviceId})
        }
        if (gotDevice.kind === 'audiooutput'){
          //console.log("audioout", gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
          audioout.push({label: gotDevice.label, id: gotDevice.deviceId})
        }
      });
      this.setState({
        videoin,
        audioin,
        audioout,
        copyItems,
        gotDevice
      }, () => {this.enableCam()}) 
      console.log("check state", this.state);
    })
    .catch(function(err) {
      console.log(err.name + ": " + err.message);
    }); 
  };
  

// C4 disable all cams // still bug
start() {
  const {mediaRecorder, vidRef} = this.state.mediaRecorder
  console.log("print active cams", vidRef, navigator)
  if (mediaRecorder){
    console.log("tem media recorder", mediaRecorder, vidRef)
  }
  console.log("B4 Window", window) 
  if (window.stream) {
    console.log("entrei aqui!!!")
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
    console.log("After Window", window.stream) 
  }
}

// C5 handle device change
handleDevChange = event => {
  /// if audio if video 
  event.preventDefault();
  console.log("Device Change block")
  console.log(event.target.value)
  console.log(event.target.id)
  if (event.target.id === 'videoin'){
    console.log("set video", event.target.value)
    this.setState({vDevID: event.target.value}, () => {
      this.enableCam()
      console.log(this.state.vDevID)
    });
    //let vDevID = event.target.value
  }
  if (event.target.id === 'audioin'){
    console.log("set audio iN")
    this.setState({aDevID: event.target.value}, () => {
      this.enableCam()
      console.log(this.state.aDevID)
    });
  }
  if (event.target.id === 'audioout'){
    console.log("set audio out")
  }
  console.log("check this.state", this.state)
  
}

// P1 - Open Player windown - future implemtation 
openPlayer = async (e) => {
  //window.open('/player', '_blank');
  e.preventDefault()
  console.log("e??", e, this.state.playURL)
  const {playURL} = this.state
  this.setState({showPlayer: false, playURL})
  await sleep(10000)
  this.setState({showPlayer: true})
}

// P2 - Player - external
playChannel = (e) => {
  e.preventDefault();
  this.setState({showPlayer: true})
}

// P3 - Player rendering
playerShow = () => {
  return (
    <div>{<VideoPlayer { ...{
      autoplay: true,
      controls: true,
      width: 640,
      height: 360,
      bigPlayButton: true,
      //token: this.state.token,
      cookie: "test",
      sources: [{
        //src: 'http://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_uncage_vanlife_admarker_60sec.m3u8',
        src: this.state.playURL,
        type: 'application/x-mpegURL',
      }]
    }}/>}</div>
  );
}

//P3.1  - if not on air
offAirshow = () => {
  return (<div>
    <img
     width= "640"
     height= "360"
     alt="Off Air"
     src={offAir}/>
  </div>)
}


// S2 - Stop streaming to IVS
stopStreaming = () => {
  const {mediaRecorder, wsRef} = this.state;
  if (mediaRecorder.current.state === 'recording') {
    mediaRecorder.current.stop();
    wsRef.current.close();
  }
  this.setState({isStreaming: false, isConnected: false, showPlayer: false});
};

//S1 - Start streaming to IVS
startStreaming = async (e) =>{
  e.preventDefault();
  const {rtmpURL, streamKey, wsRef, mediaRecorder} = this.state;
  console.log("URL", rtmpURL, streamKey);
  this.setState({
    rtmpURL,
    streamKey,
    showComponent: true
  })
  let protocol = window.location.protocol.replace('http', 'ws');
  let server = "//127.0.0.1:3004"
  // //d355h0s62btcyd.cloudfront.net
  let wsUrl = `${protocol}//${server}/rtmps/${rtmpURL}${streamKey}`;
  wsRef.current = new WebSocket(wsUrl);
  console.log("como esta o wsRef", wsRef)

  wsRef.current.addEventListener('open', async function open(data) {
    console.log("Open!!!", data) /// set state need
    this.setState({isConnected: true})
    if(data){
      console.log("!@@@@!!!")
      await sleep(25000);
      this.setState({isStreaming: true, showPlayer: true});
      //console.log("State has been set to!!!")
    }
  }.bind(this));
  wsRef.current.addEventListener('close', () => {
    this.stopStreaming();
    this.setState({isConnected: false})
    console.log("Closed!!!") /// set state need
  });

  //console.log("State do Streaming!!!!!!!", this.state.stream)

  let vidStreaming = this.state.stream.current.captureStream(30);
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
  render() {
    console.log("reder has been called");
    console.log(this.state);
    document.body.style = 'background: #262626;';
    const { showCam, videoin, audioin, audioout, stream, isConnected, isStreaming, playURL, errorMSG, apiResult, showPlayer} = this.state;
    console.log("Tem Video IN???", videoin);
    if (videoin.length > 1){
      console.log("ShowCam", showCam);
      console.log("Tem cameras?", videoin.label)
      this.enableCam()
      return (
        <div className="App">
        <div className="container-fluid" style={{backgroundColor: "#262626"}}>
            <div className="headerPlayer">
              <h1>Simple IVS Streming</h1>
              {errorMSG && (<div className="errorMSG">
                  <p>Please enable your Camera, check browser Permissions.</p>
                  <p>Error: {errorMSG}</p>
                </div>
              )}
            </div>
            
            <div className="container-fluid">
                <div className="row">
                <div className="col-lg-6">
                  <form onSubmit={this.handleSubmit} class="form-control-select">
                      <select id="videoin" class="form-control" value={this.state.value} onChange={this.handleDevChange} >
                      <option disabled>Select Camera</option>
                      {videoin.map((videoin) =>
                        <option key={videoin.id} value={videoin.id}>{videoin.label}</option>)}
                      </select>
                      <select id="audioin" class="form-control" value={this.state.value} onChange={this.handleDevChange}>
                      <option disabled>Select Audio In</option>
                      {audioin.map((audioin) =>
                        <option key={audioin.id} value={audioin.id}>{audioin.label}</option>)}
                      </select>
                    </form>
                </div>
                <div className="col-lg-6"> 
                
                <form className="form-control-select">
                        <input 
                        id="streamKey" 
                        type="text"
                        value={this.state.playURL}
                        className="form-control-play" 
                        onChange={e => this.setState({ playURL: e.target.value, isStreaming: false})}
                        />
                        <button type="submit" className="formBotPlay" onClick={this.openPlayer}>Play</button>
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
                  {showPlayer &&(<div className="playercamBOX">
                    {this.playerShow()}
                  </div>
                  )}
                  {!showPlayer && (<div className="playercamBOX">
                    {this.offAirshow()}
                  </div>)}
                </div>
                
              </div>
              </div>       
        <div className="player-wrapper"> 
          
        </div>
            <div className="row">
            {!isStreaming &&(
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
                        type="password"
                        value={this.state.streamKey}
                        className="formURL" 
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm1"
                        onChange={e => this.setState({ streamKey: e.target.value, showComponent: false})}
                        />
                        </label>
                    {!isConnected && (
                    <div className="formLabel">
                      <button type="submit" className="formBot" onClick={this.startStreaming}>GoLive!</button>
                    </div>
                    )}
                    {isConnected && (
                      <div className="formLabel">
                        <button type="submit" className="formBotConecting">GoingOnAir</button>
                      </div>
                    )}

                </form>
                </div>
                )}
                {isStreaming &&(
                  <div className="form-group">
                    <button type="submit" className="formBotStop" onClick={this.stopStreaming}>StopStreaming!</button>
                  </div>
                )}
            </div>
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
                      <th>Transcoder State:</th>
                      <td>{String(isConnected)}</td>
                    </tr>
                    <tr>
                      <th>Streaming:</th>
                      <td>{String(isStreaming)}</td>
                    </tr>
                  </tbody>
              </table>
              {isStreaming &&(
                  <div className="playerBOX">
                  <p className="formatText">Please Wait a few secs before trying to play the channel</p>
                  </div>
                )}
              </div>
            </div>         
            </div>
        </div>
      );
    } else {

      console.log("wait")
      return(
      <div>
          <div className="loading">Loading ...</div>
          {errorMSG && (<div className="errorMSG">
            <p>Please enable your Camera, check browser Permissions.</p>
            <p>Error: {errorMSG}</p>
          </div>
          )}
      </div>
      )
      
    }
  }
}
export default room;

//    Open extrenal player    <button type="submit" className="formBot" onClick={this.openPlayer}>PlayChannel!</button>


//Audio out
/*
<select id="audioout" class="form-control" value={this.state.value} onChange={this.handleDevChange}>
                      <option disabled>Select Audio Out</option>
                      {audioout.map((audioout) =>
                        <option key={audioout.id} value={audioout.id}>{audioout.label}</option>)}
                      </select>
*/
