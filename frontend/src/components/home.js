// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from 'react';
import Amplify, { API } from 'aws-amplify';
import './home.style.scss';
import awsmobile from "../aws-exports";
import  { useHistory, withRouter } from 'react-router-dom'



Amplify.configure(awsmobile);

const constraints = window.constraints = {
  audio: true,
  video: true
};

function Home (props) {

  const username = props.username;
  const [rtmpURL, setRtmpURL] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [playURL, setPlayURL] = useState('');
  const [errorMSG, setErrorMSG] = useState('');
  const [apiResult, setApiResult] = useState();
  const [configured, isConfigured] = useState(false);
  const [saved, isSaved] = useState(false);

  useEffect(() => {
    console.log('Redered!', props)
    getStream()
    getServers()
  }, [])

  //U2- get IVS Params
  const getStream = () => {
    console.log("Tem valor?", username)
    let apiName = "saveIVSparam"
    let path = `/putitens/${username}`;
    API.get(apiName, path)
    .then(ivsparams => {
      console.log(ivsparams.length)
      if (ivsparams.length === 1) {
        setApiResult(ivsparams[0])

        setRtmpURL(ivsparams[0].rtmpURL)
        setStreamKey(ivsparams[0].streamKey)
        setPlayURL(ivsparams[0].playURL)
        isConfigured(true)
      } else {
        isConfigured(false)
        }
    })
    .catch(error => {
      console.log(error);
    });
  }


  //U3- post store IVS params  
  const storeStream = e => {
    e.preventDefault();
    let apiName = "saveIVSparam"
    let path = "/putitens"
    let data = {
      body: {
        username,
        rtmpURL,
        streamKey,
        playURL
      }
    };
    API.post(apiName, path, data)
      .then(response => {
        console.log("A resta é", response)
        isSaved(true) 
        getStream();
      })
      .catch(error => {
        console.log(error.response);
      });
  }

  //C1- get CAMAERAS
  const gotoCam = async () => {
    //console.log("Constrainsts", constraints)
    try {
      await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Go to route change")
      routeChange(username)
      } catch (error) {
        console.log("Error loop", error)
        handleError(error);
      }
  
  }

  const getServers = () =>  {
    let apiName = "saveIVSparam"
    let path = `/getServers/`;
    API.get(apiName, path).then(servers =>{
      console.log("servers response", servers, servers.Items)
      if (servers.Items.length === 0){
        console.log("No servers")
      } else {
        console.log("There are", servers.Items[0].dns, servers.Items[1].dns)
      }
    })
    .catch(error => {
      console.log(error);
    });
  }

  const history = useHistory();

  //C2- get cam redir
  const routeChange = () => {
    console.log("In route change")
    history.push('/Stream', apiResult);
    //this.props.history.push(path);

  }

  //C2- cameras ERROR handling
  const handleError = (error) => {
    if (error.name === 'ConstraintNotSatisfiedError') {
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
  

  
 
    document.body.style = 'background: #262626;';
    if (!username){return (<div className="loadingData">loading configuration...</div>)}
    else {
      return (
        <div>
          <div className="container fluid" style={{backgroundColor: "#262626"}}>
              <div className="headerPlayer">
                <h1>IVS Simple Streaming</h1>
              </div>
          </div>
          <div className="enCamera">
            <div>
              <p>Welcome {username}</p>
              <p>This is a simple contribution web application to Amazon Interactive Video Service, for more details please visit the project <a href="https://github.com/aws-samples/aws-simple-streaming-webapp">GitHub</a></p>
            </div>
              {configured | apiResult && (  
                <button className="buttonEncam" type="submit" onClick={gotoCam}>Enable Cam!</button>
              )}
           </div>
              {!configured && (
                  <div>
                    <p className="configFirst">Please configure the IVS paramerters before proceeding:</p>
                  </div>
              )}
              {errorMSG && (<div className="errorMSG">
                <p>Please enable your Camera, check browser Permissions.</p>
                <p>Error: {errorMSG}</p>
                </div>)}
              {saved && ( <div className="saved">Channel has been saved for user {username}</div>)}
            
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
                        value={rtmpURL}
                        onChange={e => setRtmpURL(e.target.value)}
                        />
                      </label>
                      <label className="formLabel">
                    Stream Key:
                        <input 
                        id="streamKey" 
                        type="password"
                        className="formURL"
                        value={streamKey}
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm1"
                        onChange={e => setStreamKey(e.target.value)}
                        />
                        </label>

                        <label className="formLabel">
                    Playback URL:
                        <input 
                        id="playURL" 
                        type="text"
                        className="formURL"
                        value={playURL}
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm1"
                        onChange={e => setPlayURL( e.target.value)}
                        />
                        </label>
                      </div>
                      <div className="formLabel">
                        <button type="submit" className="formBot" onClick={storeStream}>Save</button>
                      </div>
                </form>
                </div>
               
      </div>
      </div>
      )}
  
}
export default withRouter(Home);


