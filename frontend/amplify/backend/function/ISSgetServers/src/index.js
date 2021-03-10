console.log('Carregando Evento');
const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient();
//

exports.handler = async (event) => {
    
    console.log(event);
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
        //var totalCount = response.Count;

        console.log("LEN", response.Count)

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
        console.log(resp);
        return resp
        } else {
            console.log("aqui!")
            let servers = [{"role":"primary","dns":"ec2-3-235-3-206.compute-1.amazonaws.com\\n","eventid":"sss","replaced":"no"},{"role":"secondary","dns":"ec2-3-83-82-164.compute-1.amazonaws.com","eventid":"sss","replaced":"no"}]

          

            for (const [index, server] of servers.entries()){
                console.log("For loop", server)
                
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
                //var totalCount = response.Count;
        
                console.log("LEN", response.Count)
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
                return resp
            } catch (err) {
                
            }

                
                

            
        }
        
    } catch (err) {
        console.log(err)
        return "ERROR"
    }
};