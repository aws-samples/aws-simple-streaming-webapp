// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { Component } from 'react';
import './App.css';
import logo from './img/aws.png';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import Room from './room';
import RoomAdmin from './roomadm';
import Amplify from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react'
import awsmobile from './aws-exports';

Amplify.configure(awsmobile);

class App extends Component {
  render() {
    return (
    <Router>
        <div>
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <ul className="navbar-nav mr-auto">
          <a class="navbar-brand" href="#">
            <img src={logo} alt={logo} width="65"/>
          </a>
            <li><Link to={'/'} className="nav-link">Room</Link></li>
            <li><Link to={'/admin'} className="nav-link">Admin Panel</Link></li>
          </ul>
             <ul id="nav-mobile" className="right navbar-nav">
            <li className="float-right">
                  <a className="nav-link float-right" href="/" >Logout</a>
            </li>
          </ul>
          </nav>
          <hr />
          <Switch>
              <Route exact path='/admin' component={RoomAdmin} />
              <Route exact path='/' component={Room}/>
          </Switch>
          <div>
           </div>

        </div>
      </Router>
    );
  }
}
export default withAuthenticator(App);
