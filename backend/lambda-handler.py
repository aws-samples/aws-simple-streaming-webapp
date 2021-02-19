import json
import boto3

# Set Route 53 Client
route_53 = boto3.client('route53')

# Set DynamoDB Client and Table
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
table = dynamodb.Table('ivs-task-dns-track')

# Variables with PK of DynamoDB Table

# List to store items from DynamoDB
items = ['','']

def lambda_handler(event, context):
    
    # For debugging so you can see raw event format.
    #print('Here is the event:')
    print(json.dumps(event))
        
    if (event['detail']['lastStatus'] == 'RUNNING') and (event['detail']['desiredStatus'] == 'STOPPED'):
        eni_id = event['detail']['attachments'][0]['details'][1]['value']
        eni = boto3.resource('ec2').NetworkInterface(eni_id)
        public_dns_name = eni.association_attribute['PublicDnsName']
        
        # Grap event ID
        event_id = event['id']
        
        # Grab items from DynamoDB Table
        items[0] = table.get_item(
            Key={'role':'primary'}
            )
        items[1] = table.get_item(
            Key={'role':'secondary'}
            )
            
        if not (items[0].get('role')) or not (items[0].get('replaced')):
            table.put_item(
                Item={ 
                    'role': 'primary',
                    'replaced': 'yes',
                    'eventid': 'ppp'
                }
            )
            
        if not (items[1].get('role')) or not (items[1].get('replaced')):
             table.put_item(
                Item={ 
                    'role': 'secondary',
                    'replaced': 'yes',
                    'eventid': 'sss'
                }
            )

        if (items[0]['Item']['dns'] == public_dns_name) and (items[0]['Item']['role'] == 'primary') and (items[0]['Item']['replaced'] == 'no') and (items[0]['Item']['eventid'] != event_id) and (items[1]['Item']['eventid'] != event_id):
            table.update_item(
                Key={ 'role': 'primary'},
                UpdateExpression="set replaced=:r, eventid=:e",
                ExpressionAttributeValues={
                    ':r': "yes",
                    ':e': event_id
                }
            )
            print('First IF')
            exit()
            
        elif (items[1]['Item']['dns'] == public_dns_name) and (items[1]['Item']['role'] == 'secondary') and (items[1]['Item']['replaced'] == 'no') and (items[1]['Item']['eventid'] != event_id) and (items[0]['Item']['eventid'] != event_id):
            table.update_item(
                Key={ 'role': 'secondary'},
                UpdateExpression="set replaced=:r, eventid=:e",
                ExpressionAttributeValues={
                    ':r': "yes",
                    ':e': event_id
                }
            )
            print('Second IF')
            exit()
            
    elif (event['detail']['lastStatus'] == 'RUNNING') and (event['detail']['desiredStatus'] == 'RUNNING'):
        eni_id = event['detail']['attachments'][0]['details'][1]['value']
        eni = boto3.resource('ec2').NetworkInterface(eni_id)
        public_dns_name = eni.association_attribute['PublicDnsName']
        
        # Grap event ID
        event_id = event['id']
        
        # Grab items from DynamoDB Table
        items[0] = table.get_item(
            Key={'role':'primary'}
            )
        items[1] = table.get_item(
            Key={'role':'secondary'}
            )
        
        if (items[0]['Item']['role'] == 'primary') and (items[0]['Item']['replaced'] == 'yes') and (items[0]['Item']['eventid'] != event_id) and (items[1]['Item']['eventid'] != event_id):
            
            table.update_item(
                Key={ 'role': 'primary'},
                UpdateExpression="set dns=:d, replaced=:r, eventid=:e",
                ExpressionAttributeValues={
                    ':d': public_dns_name,
                    ':r': 'no',
                    ':e': event_id
                }
            )
            print('Primary DNS Updated!!!!')
            exit()
        
        elif (items[1]['Item']['role'] == 'secondary') and (items[1]['Item']['replaced'] == 'yes') and (items[1]['Item']['eventid'] != event_id) and (items[0]['Item']['eventid'] != event_id):

            table.update_item(
                Key={ 'role': 'secondary'},
                UpdateExpression="set dns=:d, replaced=:r, eventid=:e",
                ExpressionAttributeValues={
                    ':d': public_dns_name,
                    ':r': 'no',
                    ':e': event_id
                }
            )
            print('Secondary DNS Updated!!!!')
            exit()