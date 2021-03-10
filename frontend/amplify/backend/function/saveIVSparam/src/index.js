/// version 1 simple save and get items
console.log('Carregando Evento');
const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    if (event.httpMethod == 'GET') {
        console.log('loopGet')
        // implementar get
        var user = event.path.substring(event.path.lastIndexOf('/')+1);
        console.log('User', user)
        var params = {
            TableName: "IVSparam-dev",
            Key: {
                "username": user
            }
        }       
        try {
            var response = await dynamodb.get(params).promise()    
            console.log("Response", response); 
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
        console.log('loopPost', event.body)
        var body = JSON.parse(event.body)
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
            console.log("Response", response); 
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
