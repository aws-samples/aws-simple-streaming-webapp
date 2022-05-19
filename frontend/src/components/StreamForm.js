// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from "react";
import "./styles/StreamForm.style.css";
import { API } from "@aws-amplify/api";

export default function StreamForm(props) {
  const username = props.username;
  const [rtmpURL, setRtmpURL] = useState("");
  const [channelType, setChannelType] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [playURL, setPlayURL] = useState("");
  const { onReady } = props;

  useEffect(() => {
    (async function () {
      let apiName = "saveIVSparam";
      let path = `/putitens/${username}`;
      await API.get(apiName, path)
        .then((ivsparams) => {
          if (ivsparams) {
            setChannelType(ivsparams.channelType.S);
            setRtmpURL(ivsparams.rtmpURL.S);
            setStreamKey(ivsparams.streamKey.S);
            setPlayURL(ivsparams.playURL.S);
            onReady &&
              onReady(
                ivsparams.rtmpURL.S,
                ivsparams.streamKey.S,
                ivsparams.playURL.S
              );
          } else {
            isConfigured(false);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    })();
  }, []);

  async function getStream() {}

  const storeStream = (e) => {
    e.preventDefault();
    let apiName = "saveIVSparam";
    let path = "/putitens";
    let data = {
      body: {
        username,
        channelType,
        rtmpURL,
        streamKey,
        playURL,
      },
    };
    API.post(apiName, path, data)
      .then((response) => {
        isSaved(true);
        getStream();
      })
      .catch((error) => {
        console.log(error.response);
      });
  };

  return (
    <div>
      <div className="textFormivs">
        <div className="form-ivs">
          <form className="form-URL">
            <div className="row">
              <label className="formLabel">
                Type:
                <select
                  defaultValue={channelType}
                  id="channelType"
                  type="select"
                  className="formSelect"
                  onChange={(e) => setChannelType(e.target.value)}
                >
                  <option id="Selected" value={channelType}>
                    {channelType}
                  </option>
                  <option id="IVS" value="IVS">
                    IVS
                  </option>
                  <option id="EML" value="EML">
                    EML
                  </option>
                  <option id="CUSTOM" value="CUSTOM">
                    Custom
                  </option>
                </select>
              </label>
              <label className="formLabel">
                Channel URL:
                <input
                  id="rtmpURL"
                  type="text"
                  width="100%"
                  className="formURL"
                  aria-label="Sizing example input"
                  aria-describedby="inputGroup-sizing-sm"
                  value={rtmpURL}
                  onChange={(e) => setRtmpURL(e.target.value)}
                />
              </label>
              <label className="formLabel">
                Stream Key or App name:
                <input
                  id="streamKey"
                  type="password"
                  className="formURL"
                  value={streamKey}
                  aria-label="Sizing example input"
                  aria-describedby="inputGroup-sizing-sm1"
                  onChange={(e) => setStreamKey(e.target.value)}
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
                  onChange={(e) => setPlayURL(e.target.value)}
                />
              </label>
            </div>
            <div className="formLabel">
              <button type="submit" className="formBot" onClick={storeStream}>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
