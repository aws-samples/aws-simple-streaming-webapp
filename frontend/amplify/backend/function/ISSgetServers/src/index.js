// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
console.log("Loading Event");
// aws sdk loading
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // Required for CORS support to work
    "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
  };

  let params = {
    TableName: "ISS-task-dns-track-dev",
    FilterExpression: "replaced = :n",
    ExpressionAttributeValues: {
      ":n": "no",
    },
    ExpressionAttributeNames: {
      "#serverPosition": "role",
    },
    ProjectionExpression: "dns, #serverPosition, replaced, eventid",
  };

  const scanResult = await scanDynamo(params);
  if (scanResult.Count < 1) {
    console.log("Nothing yet in the table");
    let response =
      "You need to deploy the backend container before loading this page";
    let resp = {
      statusCode: 503,
      headers: headers,
      body: JSON.stringify(response),
    };
    return resp;
  }

  const response = {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify(scanResult),
  };
  return response;

  async function scanDynamo(params) {
    console.log("Scanning DynamoBD");
    let result;
    await dynamodb
      .scan(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else result = data;
      })
      .promise();
    return result;
  }
};
