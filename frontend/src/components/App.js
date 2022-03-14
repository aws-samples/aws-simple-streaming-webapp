// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Stream from "./Stream";
import Home from "./Home";

import Amplify from "@aws-amplify/core";
import Auth from "@aws-amplify/auth";
import { withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import awsmobile from "../aws-exports";

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

  return username ? (
    <Router>
      <div>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <ul className="navbar-nav mr-auto">
            <a className="navbar-brand" href="/"></a>
            <li>
              <Link to={"/"} className="nav-link">
                Home
              </Link>
            </li>
          </ul>
          <ul id="nav-mobile" className="right navbar-nav">
            <li className="float-right">
              <a className="nav-link float-right" href="/" onClick={signOut}>
                Logout
              </a>
            </li>
          </ul>
        </nav>
        <hr />
        <Routes>
          <Route index element={<Home username={username} {...props} />} />
          <Route
            exact
            path="/Stream"
            element={<Stream username={username} {...props} />}
          />
        </Routes>
        <div></div>
      </div>
    </Router>
  ) : (
    <div>Loading</div>
  );
}

export default withAuthenticator(App);
