// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { Component } from 'react';
//import VideoPlayer from './player';
import Amplify, { Auth, API } from 'aws-amplify';
import awsmobile from "./aws-exports";
import ReactPlayer from 'react-player'
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
      isConnected: false,
      isStreaming: false,
      showPlayer: false,
      showCam: false,
      nameCanv: React.createRef(),
      wsRef: React.createRef(),
      mediaRecorder: React.createRef(),
      requestAnimationRef: React.createRef(),
      vidRef: React.createRef(),
      showencam: true,
      setCameraEnabled: false,
      playing: true,
      controls: true,
      light: false,
      volume: 0.8,
      muted: false,
      played: 0,
      loaded: 0,
      duration: 0,
      playbackRate: 1.0,
      vDevID: 'video', //replace with def 
      aDevID: document.querySelector("select#audioSource"),
      CAMERA_CONSTRAINTS: {
        audio: true,
        video: true
      },
      //constraints: { audio: true, video: { width: 1280, height: 720 }},
      rtmpURL: null,
      streamKey: {},
      playURL: {},
      showComponent: true,
    };
    //this.handleURLset = this.handleURLset.bind(this);
  }

  componentDidMount() {
    // getting access to webcam
    this.getCurrentUser()
    this.start()
    this.checkStreamig()  /// sumarize start and check stop alll video sources / tracks
    //console.log("Did Mount")
  }

  componentWillUnmount() {
  }

  getCurrentUser() {
    Auth.currentAuthenticatedUser({ bypassCache: true }).then(user => {
      console.log(user);
      this.setState({
        user,
        username: user.username
      });
      //console.log(this.state.username);
      this.getStream()
    }); 
  };

  //get IVS Params
  
  getStream() {
    const {username} = this.state;
    console.log("tem valor aqui??", username, this.state.username)
    let apiName = "saveIVSparam"
    let path = `/putitens/${username}`;
    API.get(apiName, path)
    .then(ivsparams => {
      console.log("response", ivsparams, ivsparams.length)
      if(ivsparams.length !== 0){
        this.setState({
          rtmpURL: ivsparams[0].rtmpURL,
          streamKey: ivsparams[0].streamKey,
          playURL: ivsparams[0].playURL,
          showencam: true
      })}else{
        console.log("retornou nada", ivsparams.length)
        this.setState({showencam: false})
      }
    })
    .catch(error => {
      console.log(error);
    });
  }
  

// disable all cams // still bug
start() {
  
  const {mediaRecorder, vidRef} = this.state.mediaRecorder
  console.log("print active cams", vidRef, navigator)
  if (mediaRecorder){
    console.log("tem media recorder", mediaRecorder, vidRef)
  }
  if (vidRef) {
    console.log("entrei aqui!!!")
    vidRef.getTracks().forEach(track => {
      track.stop();
    });
  }
}

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
// this handle device change 


listCam = async () => {
  // 0 list cam
  
  let copyItems = this.value
  let gotDevice = []
  let videoin = []
  let audioin = []
  let audioout = []
  await navigator.mediaDevices.enumerateDevices()
    .then(gotDevices => {
      gotDevices.forEach(function(gotDevice) {


        
        //console.log(gotDevice.kind + ": " + gotDevice.label + " id = " + gotDevice.deviceId);
        //devId = gotDevice.deviceId
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
  console.log("video ID", this.state.vDevID)
  var {vidRef} = this.state
  var constraints = { audio: {autoplay: true, deviceId: this.state.aDevID}, video: { width: 1280, height: 720, deviceId: this.state.vDevID } };
  console.log("contrainsts", constraints)
  vidRef.current = navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function(mediaStream) {
        var stream = document.querySelector("video");
        console.log("doc query selector", stream, constraints)

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

redirTo (){
  window.location.assign('/admin');
}

//Player Controls


handlePlayPause = () => {
  this.setState({ playing: !this.state.playing })
}

handleStop = () => {
  this.setState({ url: null, playing: false })
}

handleStart = () => {
  console.log("state", this.state.StartTime, this.state.playedSeconds);
  console.log("trunc",  Math.floor(this.state.playedSeconds));
  console.log ("remaining", Math.floor(this.state.duration * (1 - this.state.played)));
  //let playedsectrunc = Math.floor(this.state.playedSeconds)
  let remaining = Math.floor(this.state.duration * (1 - this.state.played))
  this.setState({ 
    playing: true,
    //Total: Number(this.state.StartTime) + Number(playedsectrunc), //for VOD
    StartTime: Math.floor(Date.now()/1000) - Number(remaining)
    
  },
  this.sendStateToParent);
  console.log ("vamo ver!", this.state.StartTime);
}

handleEnd = () => {
  //let playedsecend = Math.floor(this.state.playedSeconds)
  console.log ("remaining", Math.floor(this.state.duration * (1 - this.state.played)));
  //let playedsectrunc = Math.floor(this.state.playedSeconds)
  let remaining = Math.floor(this.state.duration * (1 - this.state.played))
  //this.setState({ url: null, playing: false })
  this.setState({ 
    //playing: false,
    //TotalEnd: Number(this.state.StartTime) + Number(playedsecend),
    EndTime: Math.floor(Date.now()/1000) - Number(remaining),
    showComponentdois: true
  })
}

handleToggleControls = () => {
  const url = this.state.url
  this.setState({
    controls: !this.state.controls,
    url: null
  }, () => this.load(url))
}

handleToggleLight = () => {
  this.setState({ light: !this.state.light })
}

handleToggleLoop = () => {
  this.setState({ loop: !this.state.loop })
}

handleVolumeChange = e => {
  this.setState({ volume: parseFloat(e.target.value) })
}

handleToggleMuted = () => {
  this.setState({ muted: !this.state.muted })
}

handleSetPlaybackRate = e => {
  this.setState({ playbackRate: parseFloat(e.target.value) })
}

handleTogglePIP = () => {
  this.setState({ pip: !this.state.pip })
}

handlePlay = () => {
  console.log('onPlay')
  this.setState({ playing: true })
}

handleEnablePIP = () => {
  console.log('onEnablePIP')
  this.setState({ pip: true })
}

handleDisablePIP = () => {
  console.log('onDisablePIP')
  this.setState({ pip: false })
}

handlePause = () => {
  console.log('onPause', this.state.playedSeconds);
  console.log(this.state);
}

handleSeekMouseDown = e => {
  //e.preventDefault();
  let StartTime = this.state.StartTime;
  if (StartTime === 0){
    StartTime = this.state.StartTime;
  };
  this.setState({ seeking: true })
  console.log("Mause DOWN");

}

handleSeekChange = e => {
  this.setState({ played: parseFloat(e.target.value) })
  //console.log("Change", e.target.value);
}

handleSeekMouseUp = e => {
  //e.preventDefault();
  this.setState({ seeking: false })
  this.player.seekTo(parseFloat(e.target.value))
  console.log("Mause UP", e.target.id);
}

handleProgress = state => {
  console.log('onProgress', state)
  // We only want to update time slider if we are not currently seeking
  if (!this.state.seeking) {
    this.setState(state)
  }
}

handleEnded = () => {
  console.log('onEnded')
  this.setState({ playing: this.state.loop })
}

handleDuration = (duration) => {
  console.log('onDuration', duration)
  this.setState({ duration })
}

/// Player Controls END ==> external module



playChannel = (e) => {
  e.preventDefault();
  this.setState({showPlayer: true})
  //call player

}

checkStreamig = () => {
  const {mediaRecorder, wsRef} = this.state;
  console.log("Check State", this.state)
  if (mediaRecorder.current){
    if (mediaRecorder.current.state === 'recording' && wsRef.current.state === 'open') {
      console.log("Its Streaming altready")
      this.setState({isStreaming: true, isConnected: true, showCam: true});
    }
  }
};

stopStreaming = () => {
  const {mediaRecorder, wsRef} = this.state;
  if (mediaRecorder.current.state === 'recording') {
    mediaRecorder.current.stop();
    wsRef.current.close();
  }
  this.setState({isStreaming: false, isConnected: false, showPlayer: false});
};

startStreaming = (e) =>{
  e.preventDefault();
  const {rtmpURL, streamKey, wsRef, mediaRecorder} = this.state;
  console.log("URL", rtmpURL, streamKey);
  this.setState({
    rtmpURL,
    streamKey,
    showComponent: true
  })
  let protocol = window.location.protocol.replace('https', 'wss');
  let server = "//d355h0s62btcyd.cloudfront.net"
  // //d355h0s62btcyd.cloudfront.net
  let wsUrl = `${protocol}//${server}/rtmps/${rtmpURL}${streamKey}`;
  wsRef.current = new WebSocket(wsUrl);
  //var setConnected = {}
  console.log("como esta o wsRef", wsRef)
  wsRef.current.addEventListener('open', function open(data) {
    console.log("Open!!!", data) /// set state need
    if(data){
      console.log("!@@@@!!!")
      this.setState({isConnected: true, isStreaming: true});
      console.log("State has been set to!!!")
    }
  }.bind(this));

  wsRef.current.addEventListener('close', () => {
    this.stopStreaming();
    this.setState({isConnected: false})
    console.log("Closed!!!") /// set state need
  });

  let vidSreaming = this.state.stream.current.captureStream(30);
  //let audioStream = new MediaStream();

  console.log ("procurando audio tracking", this.state.stream.current)
  console.log ("procurando audio tracking", this.state.stream)
  // to sem audio // to be fixed 
 
  /*
  var mediaStreamTracks = MediaStream.getAudioTracks()
  //console.log ("procurando audio tracking", mediaStreamTracks)
  
 
  const audioTracks = this.state.stream.current.getAudioTracks();
  audioTracks.forEach(function (track) {
    audioStream.addTrack(track);
  });
  */


  let outputStream = new MediaStream();
  //[audioStream, vidSreaming].forEach(function (s) {
  [vidSreaming].forEach(function (s) {
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
    const { showCam, videoin, audioin, audioout, stream, isConnected, isStreaming, playURL, showencam} = this.state;
    //Player Const
    const {showPlayer, pip, playing, controls, light, loop, playbackRate, volume, muted} = this.state;
    if (!showCam) {
      console.log("loadding");
      return (
        <div className="EnCamBOX">
        <div className="textForm">
          <p>This is a simple webRTC broadcast Demo. Amazon Interactive Video Service, for more details please contact <a href="https://phonetool.amazon.com/users/osmarb">osmarb@</a></p>
        </div>
        <div>
        {showencam && (
        <div>
          <button type="submit" className="enableCam" onClick={this.listCam}>Enable Cam!</button>
        </div>
        )}
        </div>
        <div>
        {!showencam && (
                <div>
                  <button type="submit" className="enableCam"  onClick={this.redirTo}>Config First!</button>        
                </div>
        )}
        </div>
        </div>
      )
    } else{
      console.log("ShowCam", showCam);
      console.log("Tem cameras?", videoin.label)
      return (
        
        <div className="App">
        <div className="container fluid" style={{backgroundColor: "#262626"}}>
            <div className="headerPlayer">
              <h1>Simple IVS Streming</h1>
            </div>
                <div className="row">
                <div className="col-md">
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
                      <select id="audioout" class="form-control" value={this.state.value} onChange={this.handleDevChange}>
                      <option disabled>Select Audio Out</option>
                      {audioout.map((audioout) =>
                        <option key={audioout.id} value={audioout.id}>{audioout.label}</option>)}
                      </select>
                    </form>
                </div>
              </div>
              <div className="row">
              
                <div className="webcamBOX">
                
                  <video autoPlay={true} muted={true} ref={stream} id="videoElement" controls></video>
                </div>
        
                
              </div>        
        <div className="player-wrapper"> 
          
        </div>
            <div className="row">
            <div className="col-lg">
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
                     
                    <button type="submit" className="formBot" onClick={this.startStreaming}>GoLive!</button>
                </form>
                </div>
                )}
                {isStreaming &&(
                  <div>
                    <button type="submit" className="formBotStop" onClick={this.stopStreaming}>StopStreaming!</button>
                  </div>
                )}
              </div>
            </div>
            <div className="DebugBOXger">
              <div className="DebugBOXtitle">
                <a>Info:</a>
              </div>
              <div className="DebugBOX">
              <Table className="DebugTable" variant="dark" responsive="lg" >
                  <tbody wordbreak='break-all'>
                    <tr>
                      <th width={100}>
                        Play URL:
                      </th>
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
              </Table>
              {isStreaming &&(
                  <div className="playerBOX">
                  <p className="formatText">Please Wait a few secs before trying to play the channel</p>
                  <form className="form-Player">
                  <label className="formLabel">
                    PlayURL
                        <input 
                        id="streamKey" 
                        type="text"
                        value={this.state.playURL}
                        className="formURL" 
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm1"
                        onChange={e => this.setState({ playURL: e.target.value, showComponent: false})}
                        />
                        </label>
                    <button type="submit" className="formBot" onClick={this.playChannel}>PlayChannel!</button>
                    </form>
                  </div>
                )}
                {showPlayer &&(
                  <div>                        <ReactPlayer
                  className='react-player'
                  url={this.state.playURL}
                  width='100%'
                  height='100%'
                  pip={pip}
                  playing={playing}
                  controls={controls}
                  light={light}
                  loop={loop}
                  playbackRate={playbackRate}
                  volume={volume}
                  muted={muted}
                  onReady={() => console.log('onReady')}
                  onStart={() => console.log('onStart')}
                  onPlay={this.handlePlay}
                  onEnablePIP={this.handleEnablePIP}
                  onDisablePIP={this.handleDisablePIP}
                  onPause={this.handlePause}
                  onBuffer={() => console.log('onBuffer')}
                  onSeek={e => console.log('onSeek', e)}
                  onEnded={this.handleEnded}
                  onError={e => console.log('onError', e)}
                  onProgress={this.handleProgress}
                  onDuration={this.handleDuration}
                  ref={this.ref}
                />
                </div>
                )}

              </div>
            </div>         
            </div>
        </div>
      );
    }
  }
}
export default room;


