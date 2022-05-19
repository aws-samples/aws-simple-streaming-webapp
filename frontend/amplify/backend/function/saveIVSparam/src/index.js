// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();

exports.handler = async (event) => {
  var response;
  // GET Channel Configuration
  if (event.httpMethod == "GET") {
    const getChannel = async () => {
      var user = event.path.substring(event.path.lastIndexOf("/") + 1);
      var channelParams = {
        TableName: "IVSparam-dev",
        Key: {
          "username": {
            S: user,
          },
        },
      };
      let result = await dynamodb
        .getItem(channelParams, function (err, data) {
          if (err) console.log(err, err.stack);
        })
        .promise();
      return result.Item;
    };
    await getChannel()
      .then((result) => {
        //console.log("line 28 ~ awaitgetChannel ~ result", result);
        response = result;
      })
      .catch();
  } else {
    // Create Channel Configuration
    var body = JSON.parse(event.body);
    const createChannel = async () => {
      var channelParams = {
        TableName: "IVSparam-dev",
        Item: {
          "username": { S: body.username },
          "rtmpURL": { S: body.rtmpURL },
          "channelType": { S: body.channelType },
          "streamKey": { S: body.streamKey },
          "playURL": { S: body.playURL },
        },
      };

      let result = await dynamodb
        .putItem(channelParams, function (err, data) {
          if (err) console.log(err, err.stack);
        })
        .promise();
      return result;
    };

    await createChannel()
      .then((result) => {
        //console.log("line 62 ~ createChannel ~ resp", result);
        response = result;
      })
      .catch();
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify(response),
  };
};
