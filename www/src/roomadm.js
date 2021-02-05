// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { Component } from 'react';
import Amplify, { Auth, API } from 'aws-amplify';
import './Adm.css';
import awsmobile from "./aws-exports";
import { withAuthenticator } from '@aws-amplify/ui-react'

Amplify.configure(awsmobile);

const constraints = window.constraints = {
  audio: true,
  video: true
};

class roomadm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: "",
      username: "",
      rtmpURL: "",
      streamKey: "",
      playURL: "",
      errorMSG: "",
      apiResult: false,
      showSuccess: false
    };
    //this.handleURLset = this.handleURLset.bind(this);
  }

  componentDidMount() {
    this.getCurrentUser()
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
      console.log(this.state.username);
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
      console.log(ivsparams.length)
      if (ivsparams.length === 1) {
        this.setState({
          rtmpURL: ivsparams[0].rtmpURL,
          streamKey: ivsparams[0].streamKey,
          playURL: ivsparams[0].playURL,
          apiResult: true,
          isConfigured:true
        })
      } else {this.setState({
        apiResult: true,
        isConfigured:false
        })}
    })
    .catch(error => {
      console.log(error);
    });
  }


  // store IVS params  
  storeStream = e => {
    e.preventDefault();
    console.log(e.target.value)
    console.log(this.state)
    
    const username = this.state.username
    const rtmpURL = this.state.rtmpURL
    const streamKey = this.state.streamKey
    const playURL = this.state.playURL
    let apiName = "saveIVSparam"
    let path = "/putitens"
    let data = {
      body: {
        username,
        rtmpURL,
        streamKey,
        playURL
      },
      headers: {
          //"Access-Control-Allow-Origin": "my-origin.com"
      }
    };
    API.post(apiName, path, data)
      .then(response => {
        console.log("A resta é", response)
        this.setState({showSuccess: true});
        this.getStream();
      })
      .catch(error => {
        console.log(error.response);
      });
  }

  gotoCam = async () => {
    // ask for en cam on browser
    console.log("Constrainsts", constraints)
    try {
      await navigator.mediaDevices.getUserMedia(constraints);
      window.location.assign('/encam') 
      } catch (error) {
        console.log("Error loop", error)
        this.handleError(error);
      }
  }

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
  

  
  render() {
    document.body.style = 'background: #262626;';
    const {showSuccess, username, apiResult, isConfigured, errorMSG} = this.state;
    if (!username || !apiResult){return (<div className="loading">loading configuration...</div>)}
    else {
      return (
        <div>
          <div className="container fluid" style={{backgroundColor: "#262626"}}>
              <div className="headerPlayer">
                <h1 className="title">Simple IVS Streming</h1>
              </div>
          </div>
          <div className="EnCamBOX">
            <div className="textForm">
              <p className="welcome">Welcome {username}</p>
              <p>This is a simple webRTC broadcast Sample Demo. Amazon Interactive Video Service, for more details please contact <a href="https://phonetool.amazon.com/users/osmarb">osmarb@</a></p>
            </div>
            <div>
              {isConfigured && (
                  <div className="botForm">
                    <button type="submit" className="enableCam" onClick={this.gotoCam}>Enable Cam!</button>
                  </div>
              )}
            </div>
          </div>
              {!isConfigured && (
                  <div>
                    <p className="configFirst">Please configure the IVS paramerters before proceeding:</p>
                  </div>
              )}
              {errorMSG && (<div className="errorMSG">
                <p>Please enable your Camera, check browser Permissions.</p>
                <p>Error: {errorMSG}</p>
                </div>)}
        <div className="textFormivs">
          <div className="form-ivs">
              <form className="form-URL">
              <div className="row">
                <label className="formLabel">
                  IVS URL:
                      <input 
                        id="rtmpURL" 
                        type="text"
                        width= "100%" 
                        className="formURL" 
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm"
                        value={this.state.rtmpURL}
                        onChange={e => this.setState({ rtmpURL: e.target.value, showComponent: false})}
                        />
                      </label>
                      <label className="formLabel">
                    Stream Key:
                        <input 
                        id="streamKey" 
                        type="password"
                        className="formURLplay"
                        value={this.state.streamKey}
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm1"
                        onChange={e => this.setState({ streamKey: e.target.value, showComponent: false})}
                        />
                        </label>

                        <label className="formLabel">
                    Playback URL:
                        <input 
                        id="playURL" 
                        type="text"
                        className="formURL"
                        value={this.state.playURL}
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm1"
                        onChange={e => this.setState({ playURL: e.target.value, showComponent: false})}
                        />
                        </label>
                      </div>
                      <div className="formLabel">
                        <button type="submit" className="formBot" onClick={this.storeStream}>Save</button>
                      </div>
                </form>
                </div>
                {showSuccess && ( <div className="saved">Channel has been saved for user {this.state.username}</div>)}
      </div>
      </div>
      )}
  }
}
export default withAuthenticator(roomadm);

