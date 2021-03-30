// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
console.log('Loading Event');
// aws sdk loading
const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient();

// handler
exports.handler = async (event) => {

    // dynamoDB params
    var params = {
        TableName: "ISS-task-dns-track-dev",
        FilterExpression: "replaced = :n",
        ExpressionAttributeValues: {
            ":n": "no"},
        ExpressionAttributeNames: {
            "#serverPosition": "role"
        },
        ProjectionExpression: "dns, #serverPosition, replaced"
    };
    try {
        // scan get all servers where replaced = n
        var response = await dynamodb.scan(params).promise()
        if (response.Count > 1){
        console.log("Response", response); 
        const resp = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
            },
            body: JSON.stringify(response)
        };
        return resp
        } else {
            //if no data, then load some dummy data
            let servers = [{"role":"primary","dns":"ec2-3-235-3-206.compute-1.amazonaws.com\\n","eventid":"sss","replaced":"no"},{"role":"secondary","dns":"ec2-3-83-82-164.compute-1.amazonaws.com","eventid":"sss","replaced":"no"}]
            for (const [index, server] of servers.entries()){
                // dynamoDB params                
                 var params = {
                    TableName: "ISS-task-dns-track-dev",
                    Item:{
                        "role": server.role,
                        "dns": server.dns,
                        "eventid": server.eventid,
                        "replaced": server.replaced
                    }
                }
                try {
                    var respPut = await dynamodb.put(params).promise()
                    console.log("Put! response", respPut);
                } catch (err) {
                    console.log(err)
                    return "ERROR"
                }
            }
            // then scan table
            //dynamo params
            var params = {
                TableName: "ISS-task-dns-track-dev",
                FilterExpression: "replaced = :n",
                ExpressionAttributeValues: {
                    ":n": "no"},
                ExpressionAttributeNames: {
                    "#serverPosition": "role"
                },
                ProjectionExpression: "dns, #serverPosition, replaced"
            };
            try {
                var response = await dynamodb.scan(params).promise()
                console.log("Response Dynamo", response)            
                const resp = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                        "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
                    },
                    body: JSON.stringify(response)
                };
                return resp
            } catch (err) {
                console.log(err)
                return "ERROR"
            }
        }
        
    } catch (err) {
        console.log(err)
        return "ERROR"
    }
};