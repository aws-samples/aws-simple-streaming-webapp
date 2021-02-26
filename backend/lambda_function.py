import json
import boto3

# Set the EC2 Client
ec2 = boto3.resource('ec2')

# Set DynamoDB Client
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")

# Set DynamoDB Table
table = dynamodb.Table('ivs-task-dns-track')

def get_values():

    # This function will: 1 - Populate DynamoDB if there is not items. 2 - Retrive the items from DynamoDB

    # Defines the list that will store metadata servers from DynamoDB Tale
    servers = []

    # This is a list that will be set based on DynamoDB queries.
    items = []

    # This will query dynamodb table looking for a pk named primary
    servers.append(table.get_item(
        Key={'role':'primary'}
        ))

    # In case of not finding pk primary, it will create a item with default values
    if not servers[0].get('Item'):
        set_default_values('primary','yes','ppp','ppp')
    else:
        items.append(servers[0].get('Item'))

    # This will query dynamodb table looking for a pk named secondary
    servers.append(table.get_item(
        Key={'role':'secondary'}
        ))

    # In case of not finding pk secondary, it will create a item with default values
    if not servers[1].get('Item'):
        set_default_values('secondary','yes','sss','sss')
    else:
        items.append(servers[1].get('Item'))

    return items
  

def set_default_values(role,replaced,default_id,dns):

    # This function will be used to set default values on DynamoDB table.
    
    items = []
    
    table.put_item(
        Item={
            'role': role,
            'replaced': replaced,
            'eventid': default_id,
            'dns':  dns
        }
    )
    
def update_values(role, replaced, eventid, dns='not_defined'):

    # This function will be used to update server values on DynamoDB table.

    table.update_item(
                Key={ 'role': role},
                UpdateExpression="set replaced=:r, eventid=:e, dns=:d",
                ExpressionAttributeValues={
                    ':r': replaced,
                    ':e': eventid,
                    ':d': dns
                }
            )

def get_public_ip(eni_id):

    # This function will retrive the fqdn of the servers
    # InvalidNetworkInterfaceID.NotFound as error:

    try:
        eni = ec2.NetworkInterface(eni_id)
        fqdn = eni.association_attribute['PublicDnsName']
        return fqdn
    except: 
        print('The Network Interface does not exist! This lambda function will finish here')
        return None

def set_to_replace(primary,secondary,public_dns_name,eventid):
    
    # This function will set the servers to be replaces by futures ones
    
    # This will configure the metadata of the primary server to be replaced by the new future server
    if (primary.get('dns') == public_dns_name) and (primary.get('role') == 'primary') and (primary.get('replaced') == 'no') and (primary.get('eventid') != eventid) and (secondary.get('eventid') != eventid):
        
            update_values('primary','yes',eventid)
            #print('First IF')
            return None

    # This will configure the metadata of the primary server to be replaced by the new future server
    elif (secondary.get('dns') == public_dns_name) and (secondary.get('role') == 'secondary') and (secondary.get('replaced') == 'no') and (secondary.get('eventid') != eventid) and (primary.get('eventid') != eventid):
            
            update_values('secondary','yes',eventid)
            #print('Second IF')
            return None
            
            
def set_new_server(primary,secondary,public_dns_name,eventid):
    
    # This function will set the metadata for the new primary or secondary server
    
    # This will register the metadata of the new primary server
    if (primary.get('role') == 'primary') and (primary.get('replaced') == 'yes') and (primary.get('eventid') != eventid) and (secondary.get('eventid') != eventid):
            
        update_values('primary','no',eventid, public_dns_name)
        print('Primary DNS Updated!!!!')
        return None
        
    # This will register the metadata of the new secondary server
    elif (secondary.get('role') == 'secondary') and (secondary.get('replaced') == 'yes') and (secondary.get('eventid') != eventid) and (primary.get('eventid') != eventid):

        update_values('secondary','no',eventid, public_dns_name)
        print('Secondary DNS Updated!!!!')
        return None
        
        
    
def lambda_handler(event, context):
    
    # Stores the event_id of the event
    event_id = event['id']
    
    # Debug
    print('Tracking all Status')
    print(event)

    # This will be valid if the server transition from running to stop stage.
    if (event['detail']['lastStatus'] == 'RUNNING') and (event['detail']['desiredStatus'] == 'STOPPED'):
        eni_id = event['detail']['attachments'][0]['details'][1]['value']
        public_dns_name = get_public_ip(eni_id)

        # Calls get_values to retrive server metadata
        items = get_values()
        
        # Calls set_to_replace when a server dies
        set_to_replace(items[0],items[1],public_dns_name,event_id)
        
   # This will run if the new server comes online
    elif (event['detail']['lastStatus'] == 'RUNNING') and (event['detail']['desiredStatus'] == 'RUNNING'):
        eni_id = event['detail']['attachments'][0]['details'][1]['value']
        public_dns_name = get_public_ip(eni_id)

        # Calls get_values to retrive server metadata
        items = get_values()
        
        # Calls set_new_server function
        set_new_server(items[0],items[1],public_dns_name,event_id)
        