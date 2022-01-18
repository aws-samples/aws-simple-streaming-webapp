// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
console.log('Loading Event');
// aws sdk loading
const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cloudfront = new AWS.CloudFront();
const jobSettings = require('./cloudFrontTemplate.json');


// handler
exports.handler = async (event) => {
    var distribValues = {Id:"", DomainName:""};
    // dynamoDB params
    var params = {
        TableName: "ISS-task-dns-track-dev",
        FilterExpression: "replaced = :n",
        ExpressionAttributeValues: {
            ":n": "no"},
        ExpressionAttributeNames: {
            "#serverPosition": "role"
        },
        ProjectionExpression: "dns, #serverPosition, replaced, eventid"
    };
    try {
        var response = await dynamodb.scan(params).promise()
        if (response.Count > 1){
            if (response.Items[0].eventid != "apigw"){
                console.log("CloudFront update")
                // action 1 create a new distributions adding the server to the distribution
                jobSettings.DistributionConfig.CallerReference = Date.now().toString()
                jobSettings.DistributionConfig.Origins.Items[0].Id = response.Items[0].dns
                jobSettings.DistributionConfig.Origins.Items[0].DomainName = response.Items[0].dns
                jobSettings.DistributionConfig.DefaultCacheBehavior.TargetOriginId = response.Items[0].dns
                var CFparams = jobSettings
                //console.log(jobSettings); 
                await cloudfront.createDistribution(CFparams, function(err, data) {
                    if (err) console.log("err", /*err, err.stack*/); // an error occurred
                    else{
                        //console.log(data);
                        distribValues.Id = data.Distribution.Id
                        distribValues.DomainName = data.Distribution.DomainName

                        console.log(distribValues)
                    }             
                }).promise();

                if(distribValues.DomainName){
                    console.log("Dynamo Update")
                    let servers = [{"role":"primary","dns":distribValues.DomainName, "distid":distribValues.Id, "eventid":"apigw","replaced":"no"},{"role":"secondary","dns":distribValues.DomainName, "distid":distribValues.Id, "eventid":"apigw","replaced":"no"}]
                    for (const [index, server] of servers.entries()){
                        var params = {
                            TableName: "ISS-task-dns-track-dev",
                            Item:{
                                "role": server.role,
                                "dns": server.dns,
                                "distid": server.distid,
                                "eventid": server.eventid,
                                "replaced": server.replaced
                            }
                        }

                        console.log("Params", params)
                        

                        try {
                            await dynamodb.put(params, function(err, data) {
                                if (err) console.log(err, err.stack); // an error occurred
                                else{
                                    console.log("Dynamo!!!", data);           // successful response
                                }
                            }).promise();
                            
                        } catch (err) {
                            console.log(err)
                        }
                    }
                }
                response = await dynamodb.scan(params).promise()
            }
             
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
                console.log("Nothing yet in the table")   
                response = "You need to deploy the backend container before loading this page"        
                const resp = {
                    statusCode: 503,
                    headers: {
                        "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
                        "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
                    },
                    body: JSON.stringify(response)
                };
                return resp
            }
    } catch (err) {
        console.log(err)
        return "ERROR"
    }
            
};