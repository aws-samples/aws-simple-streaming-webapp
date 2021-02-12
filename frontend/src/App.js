// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { Component } from 'react';
import logo from './img/aws.png';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import Stream from './components/stream';
import Home from './components/home';
import Amplify, { Auth } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react'
import awsmobile from './aws-exports';

Amplify.configure(awsmobile);


class App extends Component {

  signOut = () => {
    Auth.signOut();
  };

  render() {
    return (
    <Router>
        <div>
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <ul className="navbar-nav mr-auto">
          <a class="navbar-brand" href="#">
            <img src={logo} alt={logo} width="65"/>
          </a>
            <li><Link to={'/'} className="nav-link">Home</Link></li>
          </ul>
             <ul id="nav-mobile" className="right navbar-nav">
             <li className="float-right">
                  <a className="nav-link float-right" href="/" onClick={this.signOut}>Logout</a>
            </li>
          </ul>
          </nav>
          <hr />
          <Switch>
              <Route exact path='/' component={Home} />
              <Route exact path='/encam' component={Stream}/>
          </Switch>
          <div>
           </div>

        </div>
      </Router>
    );
  }
}
export default withAuthenticator(App);
