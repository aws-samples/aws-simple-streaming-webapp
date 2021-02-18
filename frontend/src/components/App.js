// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from 'react';
import logo from '../img/aws.png';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import Stream from './stream';
import Home from './home';

import Amplify, { Auth } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react'
import awsmobile from '../aws-exports';

Amplify.configure(awsmobile);

function App(props){

 
  const [username, setUsername] = useState();

  useEffect(()=>{
    //getCurrentUser()

    (async function() {
      try {
        await Auth.currentAuthenticatedUser({ bypassCache: false }).then(user => {
          console.log(user);
          setUsername(user.username)
        })
      } catch (e) {
          console.error('Error, no logeeed user ' , e);
      }
  })();
    console.log('component mounted!')
  },[]) //notice the empty array here


  const signOut = () => {
    Auth.signOut();
  };

    return username ? (
    <Router>
        <div>
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <ul className="navbar-nav mr-auto">
          <a className="navbar-brand" href="#">
            <img src={logo} alt={logo} width="65"/>
          </a>
            <li><Link to={'/'} className="nav-link">Home</Link></li>
          </ul>
             <ul id="nav-mobile" className="right navbar-nav">
             <li className="float-right">
                  <a className="nav-link float-right" href="/" onClick={signOut}>Logout</a>
            </li>
          </ul>
          </nav>
          <hr />
          <Switch>
              <Route exact path='/' render={(props) => <Home username={username} {...props} /> } />
              <Route exact path='/Stream' render={(props) => <Stream username={username} {...props} /> }/>
          </Switch>
          <div>
           </div>
        </div>
      </Router>
    ):(<div>Loading</div>)
  }

export default withAuthenticator(App);
