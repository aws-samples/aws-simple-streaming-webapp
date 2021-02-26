#!/bin/bash

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# This is just a initial simple script that allow you run all command to deploy ivs-webrtc at once
# At the moment, this script is not handling errors, so use it on your own risk


function iam_resources () {

    # This function will create all IAM resources required by ivs-webrtc

    # Create the Amazon ECS execution role that will be used on our ECS Container.
    echo -e "${GREEN}Creating Amazon ECS execution role...${NC}"
    aws iam create-role --role-name ivs-ecs-execution-role --assume-role-policy-document file://json_configs/ivs_ecs_trust_policy.json \
| jq '.Role.Arn' | sed 's/"//g' > ./temp_files/ivs_ecs_execution_role_arn.txt


    # Attach the required policies to Amazon ECS execution role you just created.
    echo -e "${GREEN}Attaching the required policies to Amazon ECS execution role...${NC}"
    aws iam attach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
&& aws iam attach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/AWSOpsWorksCloudWatchLogs

    # Create the AWS Lambda execution role that will allow lambda to access the required AWS resources.
    echo -e "${GREEN}Creating the AWS Lambda execution role that will allow lambda to access the required AWS resources${NC}"
    aws iam create-role --role-name ivs-lambda-role --assume-role-policy-document file://json_configs/ivs_lambda_trust_policy.json > /dev/null

    # Attach the required policies to AWS Lambda execution role you just created.
    echo -e "${GREEN}Attaching required policies to AWS Lambda execution role...${NC}"
    aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 
    aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess 
    aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn $(aws iam create-policy --policy-name ivs_dynamodb --policy-document file://json_configs/ivs_lambda_dynamodb_policy.json | jq '.Policy.Arn' | sed 's/"//g' > ./temp_files/lambda_policy_arn.txt && cat ./temp_files/lambda_policy_arn.txt)

    lambda_resources

}

function lambda_resources () {

    # This function will create all lambda resources required by ivs-webrtc

    #Creates lambda.json with our lambda configuration
    echo -e "${GREEN}Creating the lambda.json with our lambda configuration...${NC}"
    lambda_role_arn=$(aws iam get-role --role-name ivs-lambda-role | jq '.Role.Arn' | sed 's/"//g') && jq --arg v "$lambda_role_arn" '. |= . + {"Role":$v}' \
./json_models/lambda_model.json > ./json_configs/lambda.json

    sleep 10

    #Creates the ivs-ip-register lambda function
    echo -e "${GREEN}Creating the the ivs-ip-register lambda function...${NC}"
    aws lambda create-function --cli-input-json file://json_configs/lambda.json --zip-file fileb://lambda.zip > /dev/null

    dynamodb_resources

}

function dynamodb_resources () {

    # Ths function will create all dynamodb resources required by ivs-webrtc

    #Creates the Amazon DynamoDB ivs-task-dns-track table
    echo -e "${GREEN}Creating the Amazon DynamoDB ivs-task-dns-track table...${NC}"
    aws dynamodb create-table --cli-input-json file://json_configs/dynamodb_table.json > /dev/null

    # We should give time to dynamodb table become ready
    sleep 10

    #Populates the Amazon DynamoDB ivs-task-dns-track table with the initial values
    echo -e "${GREEN}Populating the Amazon DynamoDB ivs-task-dns-track table...${NC}"
    aws dynamodb batch-write-item --request-items file://json_configs/ivs_dynamodb_populate.json

    vpc_resources

}

function vpc_resources () {

    # This function will create the security group required by ivs-webrtc

    #The Security Group
    echo -e "${GREEN}Creating the ivs-sg security group...${NC}"
    aws ec2 create-security-group --group-name ivs-sg --description "IVS WetRTC Security Group" --vpc-id $(aws ec2 describe-vpcs \
| jq '.Vpcs[] | select(.IsDefault)' | jq '.VpcId' | sed 's/"//g') | jq '.GroupId' | sed 's/"//g' > ./temp_files/ivs_sg.txt && while read line; \
do aws ec2 authorize-security-group-ingress --group-id $(cat ./temp_files/ivs_sg.txt) --protocol tcp --port $line --cidr 0.0.0.0/0; done < ./json_models/ivs_ports.txt

    fargate_resources

}

function fargate_resources () {

    # This function will create all fargate resources required by ivs-webrtc

    #Creates the Amazon ECS Cluster named ivs
    echo -e "${GREEN}Creating the Amazon ECS Cluster named ivs...${NC}"
    aws ecs create-cluster --cluster-name ivs | jq '.cluster.clusterArn' | sed 's/"//g' > ./temp_files/ecs_cluster_arn.txt

    #Configures the ivs_task_definition.json file with the correct Amazon ECS execution previously created
    echo -e "${GREEN}Configuring the ivs_task_definition.json file with the correct Amazon ECS execution...${NC}"
    ecs_role_arn=$(cat ./temp_files/ivs_ecs_execution_role_arn.txt) && jq --arg v "$ecs_role_arn" '. |= . + {"taskRoleArn":$v,"executionRoleArn":$v}' \
./json_models/ivs_task_definition_model.json > ./json_configs/ivs_task_definition.json

    #Creates Amazon ECS Task Definition named ivs-webrtc
    echo -e "${GREEN}Creating the Amazon ECS Task Definition named ivs-webrtc...${NC}"
    aws ecs register-task-definition --cli-input-json file://json_configs/ivs_task_definition.json > /dev/null

    #Select the proper subnets from your default vpc to be used by Amazon ECS Service
    echo -e "${GREEN}Selecting the proper subnets from your default vpc to be used by Amazon ECS Service...${NC}"
    aws ec2 describe-subnets --filter Name=vpc-id,Values=$(aws ec2 describe-vpcs | jq '.Vpcs[] | select(.IsDefault)' | jq '.VpcId' | sed 's/"//g') \
--query 'Subnets[?MapPublicIpOnLaunch==`true`].SubnetId' | sed -e '/^$/d;:a;N;$!ba;s/\n//g;s/ //g;s/[][]//g;s/.$//;s/^.//' > ./temp_files/my_subnets.txt

    #Creates the template ivs_ecs_service.json to be used by the Amazon ECS Server
    echo -e "${GREEN}Creating the template ivs_ecs_service.json to be used by the Amazon ECS Server...${NC}"
    store_sgid=$( cat ./temp_files/ivs_sg.txt) && store_subnets=$(sed -e 'N;s/\n//;N;s/\n//;N;s/\n//' ./temp_files/my_subnets.txt \
| sed -e 'N;s/\n//;s/ //g;s/[][]//g;s/^"//g;s/"$//g') && jq --arg v "$store_subnets" '.networkConfiguration.awsvpcConfiguration |= . + {"subnets":[$v]}' \
./json_models/ecs_services_model.json | jq --arg v "$store_sgid" '.networkConfiguration.awsvpcConfiguration |= . + {"securityGroups":[$v]}' \
| sed -e 's/\\//g' > ./json_configs/ivs_ecs_service.json

    #Creates the Amazon ECS service named ivs-webrtc
    echo -e "${GREEN}Creating the Amazon ECS service named ivs-webrtc...${NC}"
    aws ecs create-service --cli-input-json file://json_configs/ivs_ecs_service.json > /dev/null

    eventbridge_resources

}

function eventbridge_resources () {

    # This function will create all eventbridge resources required by ivs-webrtc

    #Configures the ivs_events_rule.json with the correct ivs service configured in out Amazon ECS Cluster
    echo -e "${GREEN}Configuring the ivs_events_rule.json with the correct ivs service configured in out Amazon ECS Cluster...${NC}"
    ecs_arn=$(cat ./temp_files/ecs_cluster_arn.txt) && sed -e "s@ARN_HERE@${ecs_arn}\\\@g" \
json_models/ivs_events_rule_model.json > ./json_configs/ivs_events_rule.json

    #Create the Amazon EventBridge rule named ip-register
    echo -e "${GREEN}Creating the Amazon EventBridge rule named ip-register...${NC}"
    aws events put-rule --cli-input-json file://json_configs/ivs_events_rule.json | jq '.RuleArn' | sed 's/"//g' > ./temp_files/ivs_event_rule_arn.txt

    #Creating the resource policy template
    echo -e "${GREEN}Creating the resource policy template...${NC}"
    aws lambda get-function --function-name ivs-ip-register | jq '.Configuration.FunctionArn' | sed 's/"//g' > ./temp_files/ivs_lambda_function_arn.txt

    #Adding permission to ip-register rule invoke lambda funtion ivs-ip-register
    echo -e "${GREEN}Adding permission to ip-register rule invoke lambda funtion ivs-ip-register...${NC}"
    aws lambda add-permission --function-name ivs-ip-register --action lambda:InvokeFunction --statement-id events --principal events.amazonaws.com --source-arn=$(cat ./temp_files/ivs_event_rule_arn.txt) > /dev/null

    #Add lambda function ivs-ip-register as a target to the event rule ip-register
    echo -e "${GREEN}Adding lambda function ivs-ip-register as a target to the event rule ip-register...${NC}"
    aws events remove-targets --rule ip-register --ids "1" && aws events put-targets --rule ip-register --targets "Id"="1","Arn"="$(cat ./temp_files/ivs_lambda_function_arn.txt)" > /dev/null

    cloudwatchlogs_resources

}

function cloudwatchlogs_resources () {

    # This function create all cloudwatchlogs resources required by ivs-webrtc

    #Creating cloudwatch log group name for ivs-webrtc tasks
    echo -e "${GREEN}Creating cloudwatch log group name for ivs-webrtc tasks...${NC}"
    aws logs create-log-group --log-group-name /ecs/ivs-webrtc

    fargate_adjust_service
}

function fargate_adjust_service () {

    # This function will adjust the fargate service ivs-webrtc from 0 to 2 tasks
    echo -e "${GREEN}Adjusting fargate service to 2 tasks...${NC}"
    aws ecs update-service --cluster ivs --service ivs-webrtc --desired-count 2 > /dev/null

    echo -e "${GREEN}Deployment done!!!${NC}"
}

# Calls the iam_resources function. All the other function will call the next in sequence.
iam_resources 