// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { Component } from 'react';
import Amplify, { Auth, API } from 'aws-amplify';
import awsmobile from "./aws-exports";

Amplify.configure(awsmobile);

class roomadm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: "",
      username: "",
      rtmpURL: null,
      streamKey: "",
      playURL: "",
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
      console.log(ivsparams[0].rtmpURL)
      this.setState({
        rtmpURL: ivsparams[0].rtmpURL,
        streamKey: ivsparams[0].streamKey,
        playURL: ivsparams[0].playURL
      })
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
      })
      .catch(error => {
        console.log(error.response);
      });
  }
  
  render() {
    document.body.style = 'background: #262626;';
    const {showSuccess} = this.state;
      return (
        <div className="textForm">
          <h1>Configuration and Settings</h1>
          <h2>Please set your IVS Stream</h2>
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
                        className="formURL"
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
                        className="formURLplay"
                        value={this.state.playURL}
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm1"
                        onChange={e => this.setState({ playURL: e.target.value, showComponent: false})}
                        />
                        </label>
                      </div>
                    <button type="submit" className="formBot" onClick={this.storeStream}>Save</button>
                </form>
                </div>
                {showSuccess && ( <div>Channel has been saved for user {this.state.username}</div>)}
        <br/>
        <p>Admin panel: under development, it will control the transcoder server, for more details please contact <a href="https://phonetool.amazon.com/users/osmarb">osmarb@</a></p>
      </div>
      )
  }
}
export default roomadm;

