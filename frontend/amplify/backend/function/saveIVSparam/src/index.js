// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
console.log('Loading event');
// aws sdk load
const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient();

// handler
exports.handler = async (event) => {
    //Method get
    if (event.httpMethod == 'GET') {
        console.log("Method Get")
        // get user
        var user = event.path.substring(event.path.lastIndexOf('/')+1);
        console.log('User is:', user)
        // dynamoDB params
        var params = {
            TableName: "IVSparam-dev",
            Key: {
                "username": user
            }
        }       
        try {
            var response = await dynamodb.get(params).promise()    
            console.log("DynamoDB Response:", response); 
            const resp = {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                    "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
                },
                body: JSON.stringify([response.Item])
            };
            console.log(resp);
            return resp;
        } catch (err) {
            console.log(err)
            return "ERROR"
        }        
    } else {
        console.log("Method Post", event.body)
        // parse body
        var body = JSON.parse(event.body)
        // dynamoDB params post
        var params = {
            TableName: "IVSparam-dev",
            Item:{
                "username": body.username,
                "rtmpURL": body.rtmpURL,
                "streamKey": body.streamKey,
                "playURL": body.playURL
            }
        }
        try {
            var response = await dynamodb.put(params).promise()
            console.log("dynamoDB response:", response); 
            const resp = {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                    "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
                },
                body: JSON.stringify(response)
            };
            console.log(resp);
            return resp;
        } catch (err) {
            console.log(err)
            return "ERROR"
        }
    }
};
