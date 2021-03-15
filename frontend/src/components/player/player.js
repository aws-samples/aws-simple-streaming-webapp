// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import videojs from 'video.js';
import  'video.js/dist/video-js.css'

export default class VideoPlayer extends React.Component {
  
  constructor(props) {
    super(props);
  }
  
  componentDidMount() {
    videojs.Hls.xhr.beforeRequest = function (options) {
      options.uri = `${options.uri}`;
      return options;
    };
    this.player = videojs(this.videoNode, this.props,function onPlayerReady() {
      console.log('onPlayerReady', this)
    });
  }
  componentWillUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }
  render() {
    return (
      <div>
        <div data-vjs-player>
        <video ref={ node => this.videoNode = node } className="video-js"></video>
        </div>
      </div>
    );
  }
}

// ?token=${videojs.getAllPlayers()[0].options().token}

