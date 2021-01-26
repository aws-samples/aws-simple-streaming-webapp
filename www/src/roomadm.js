// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { Component } from 'react';


class roomadm extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
    //this.handleURLset = this.handleURLset.bind(this);
  }

  componentDidMount() {
    //this.getCurrentUser()
  }

  componentWillUnmount() {
  }



  render() {
    document.body.style = 'background: #262626;';
    const { token, showComponent } = this.state;
    console.log("tem token?", token)
    const { videoURL }  = this.state;
      return (
        <div className="textForm">
        <p>Admin panel: under development, it will control the transcoder server, for more details please contact <a href="https://phonetool.amazon.com/users/osmarb">osmarb@</a></p>
      </div>
      )
  }
}
export default roomadm;

