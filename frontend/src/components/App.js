// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import UserMedia from "./UserMedia";
import HomePage from "./HomePage";
import PlayerView from "./PlayerView";
import "./App.css";

import Amplify from "@aws-amplify/core";
import Auth from "@aws-amplify/auth";
import { withAuthenticator } from "@aws-amplify/ui-react";
import awsmobile from "../aws-exports";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(awsmobile);
Auth.configure(awsmobile);

function App(props) {
  const [username, setUsername] = useState();

  useEffect(() => {
    (async function () {
      try {
        await Auth.currentAuthenticatedUser({ bypassCache: false }).then(
          (user) => {
            console.log(user);
            setUsername(user.username);
          }
        );
      } catch (e) {
        console.error("Error, no logeeed user ", e);
      }
    })();
    console.log("component mounted!");
  }, []);

  const signOut = () => {
    Auth.signOut();
  };

  const openModal = () => {
    console.log("Ok!Here");
  };

  return username ? (
    <Router>
      <div>
        <nav className="navbar navbar-dark bg-dark">
          <a href="/">Simple Streaming</a>
          <button id="openplayer" className="btn btn-outline-info">
            Open Player
          </button>
          <button className="btn btn-outline-danger" onClick={signOut}>
            Logout
          </button>
        </nav>
        <Routes>
          <Route index element={<HomePage username={username} {...props} />} />
          <Route
            exact
            path="/UserMedia"
            element={<UserMedia username={username} {...props} />}
          />
          <Route
            exact
            path="/HomePage"
            element={<HomePage username={username} {...props} />}
          />
          <Route
            exact
            path="/PlayerView"
            element={<PlayerView username={username} {...props} />}
          />
        </Routes>
      </div>
    </Router>
  ) : (
    <div>Loading</div>
  );
}

export default withAuthenticator(App);
