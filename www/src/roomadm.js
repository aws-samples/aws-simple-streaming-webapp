// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { Component } from 'react';
//import VideoPlayer from './player';
import Amplify, { Auth } from 'aws-amplify';
//import awsmobile from "./aws-exports";
import Table from 'react-bootstrap/Table';

//Amplify.configure(awsmobile);

class testplayer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      token: 0,
      videoURL: "http://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_uncage_vanlife_admarker_60sec.m3u8",
      showComponent: true,
    };
    this.handleURLset = this.handleURLset.bind(this);
  }

  componentDidMount() {
    this.getCurrentUser()
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

handleURLset = (e) =>{
  e.preventDefault();
  const {videoURL} = this.state;
  console.log("URL", videoURL);
  this.setState({
    videoURL,
    showComponent: true
  })
  this.playerShow()
} 

/*
playerShow = () => {
  return (
    <div>{<VideoPlayer { ...{
      autoplay: false,
      controls: true,
      width: 720,
      height: 420,
      bigPlayButton: true,
      token: this.state.token,
      cookie: "test",
      sources: [{
        src: this.state.videoURL,
        type: 'application/x-mpegURL',
      }]
    }}/>}</div>
  );
}
*/

  render() {
    console.log("reder has been called");
    console.log(this.state);
    document.body.style = 'background: #262626;';
    const { token, showComponent } = this.state;
    console.log("tem token?", token)
    const { videoURL }  = this.state;
    if (token === 0) {
      console.log("loadding");
      return (
        <div>Loading...</div>
      )
    } else{
      console.log("tem valor", token);
      return (
        
        <div className="App">
        <div className="container fluid" style={{backgroundColor: "#262626"}}>
            <div className="headerPlayer">
              <h1>Video Player (Video.JS for tests)</h1>
            </div>
            <div className="row">
            <div className="col-sm-1"></div>
            <div className="col-lg">
            <div className="form-group">
              <form className="form-URL">
                <label className="formLabel">
                  Video URL (.m3u8):
                      <input 
                        id="VideoURL" 
                        type="text"
                        width= "100%" 
                        value={this.state.videoURL}
                        className="formURL" 
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm"
                        onChange={e => this.setState({ videoURL: e.target.value, showComponent: false})}
                        />
                      </label>
                    <button type="submit" className="formBot" onClick={this.handleURLset}>Play</button>
                </form>
                </div>
              </div>
            </div>
            <div className="player-wrapper">
              <a>go canvas</a>
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
                      <td>{videoURL}</td>
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
export default testplayer;

