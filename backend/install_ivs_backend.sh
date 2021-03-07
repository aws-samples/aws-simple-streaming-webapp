#!/bin/bash

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# This is just a initial simple script that allow you run all command to deploy ivs-webrtc at once
# At the moment, this script is not handling errors, so use it on your own risk


function iam_resources () {

    # This function will create all IAM resources required by ivs-webrtc
    
    # Test if exists
    aws iam get-role --role-name ivs-ecs-execution-role > /dev/null 2>&1 && iam='OK' || iam='NOK'
    
    if [ $iam = 'NOK' ]
    then
    
        # Create the Amazon ECS execution role that will be used on our ECS Container.
        echo -e "${GREEN}Creating Amazon ECS execution role...${NC}"
        aws iam create-role --role-name ivs-ecs-execution-role --assume-role-policy-document file://json_configs/ivs_ecs_trust_policy.json \
| jq '.Role.Arn' | sed 's/"//g' > ./temp_files/ivs_ecs_execution_role_arn.txt

    else
    
        aws iam get-role --role-name ivs-ecs-execution-role | jq '.Role.Arn' | sed 's/"//g' > ./temp_files/ivs_ecs_execution_role_arn.txt
        
    fi
    
    unset iam

    # Attach the required policies to Amazon ECS execution role you just created.
    echo -e "${GREEN}Attaching the required policies to Amazon ECS execution role...${NC}"
    aws iam attach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
&& aws iam attach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/AWSOpsWorksCloudWatchLogs

    # Test if exists
    aws iam get-role --role-name ivs-ecs-execution-role > /dev/null 2>&1 && iam='OK' || iam='NOK'
    
    if [ $iam = 'NOK' ]
    then
    
        # Create the AWS Lambda execution role that will allow lambda to access the required AWS resources.
        echo -e "${GREEN}Creating the AWS Lambda execution role that will allow lambda to access the required AWS resources${NC}"
        aws iam create-role --role-name ivs-lambda-role --assume-role-policy-document file://json_configs/ivs_lambda_trust_policy.json > /dev/null

    fi
    
    unset iam
    
    # Attach the required policies to AWS Lambda execution role you just created.
    echo -e "${GREEN}Attaching first policy to AWS Lambda execution role...${NC}"
    aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    echo -e "${GREEN}Attaching second policy to AWS Lambda execution role...${NC}"
    aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess 
    
    iam=$(aws iam list-policies --scope Local | jq '.Policies[] | select(.PolicyName=="ivs_dynamodb")' | jq '.Arn' | sed 's/"//g')
    
    if [ $iam = '' ]
    then
        
        echo -e "${GREEN}Attaching last policy to AWS Lambda execution role...${NC}"
        aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn $(aws iam create-policy --policy-name ivs_dynamodb --policy-document file://json_configs/ivs_lambda_dynamodb_policy.json | jq '.Policy.Arn' | sed 's/"//g' > ./temp_files/lambda_policy_arn.txt && cat ./temp_files/lambda_policy_arn.txt)
        
    else
        
        echo -e "${GREEN}Attaching last policy to AWS Lambda execution role...${NC}"
        aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn $(aws iam list-policies --scope Local | jq '.Policies[] | select(.PolicyName=="ivs_dynamodb")' | jq '.Arn' | sed 's/"//g')
    
    fi
        
}

function lambda_resources () {
    
    unset lambda

    # This function will create all lambda resources required by ivs-webrtc
    
    #Test if exists
    aws iam get-role --role-name ivs-lambda-role > /dev/null 2>&1 && lambda='OK' || lambda='NOK'
    
    if [ $lambda = 'OK' ]
    then
    
        #Creates lambda.json with our lambda configuration
        echo -e "${GREEN}Creating the lambda.json with our lambda configuration...${NC}"
        lambda_role_arn=$(aws iam get-role --role-name ivs-lambda-role | jq '.Role.Arn' | sed 's/"//g') && jq --arg v "$lambda_role_arn" '. |= . + {"Role":$v}' \
./json_models/lambda_model.json > ./json_configs/lambda.json

    else
    
        error_exit 'The ivs-lambda-role was not found! Please re-run ./deployment.sh deploy iam'

    fi
    
    unset lambda
    sleep 10
    
    #Test if exists
    aws lambda get-function --function-name ivs-ip-register > /dev/null 2>&1 && lambda='OK' || lambda='NOK'
    
    if [ $lambda = 'NOK' ]
    then
    
        #Creates the ivs-ip-register lambda function
        echo -e "${GREEN}Creating the the ivs-ip-register lambda function...${NC}"
        aws lambda create-function --cli-input-json file://json_configs/lambda.json --zip-file fileb://lambda.zip > /dev/null
    fi
}

function dynamodb_resources () {

    # Ths function will create all dynamodb resources required by ivs-webrtc

    table=$(aws dynamodb list-tables | sed -n -e '/.*ivs/p' | sed -e 's/ //g;s/"//g;s/,//g')
    
    if [ ! $table ]
    then

        #Creates the Amazon DynamoDB ivs-task-dns-track table
        echo -e "${GREEN}Creating the Amazon DynamoDB ivs-task-dns-track table...${NC}"
        aws dynamodb create-table --cli-input-json file://json_configs/dynamodb_table.json > /dev/null
        aws dynamodb wait table-exists --table-name ivs-task-dns-track

        #Populates the Amazon DynamoDB ivs-task-dns-track table with the initial values
        echo -e "${GREEN}Populating the Amazon DynamoDB ivs-task-dns-track table...${NC}"
        aws dynamodb batch-write-item --request-items file://json_configs/ivs_dynamodb_populate.json > /dev/null
    
    else
        
        #Populates the Amazon DynamoDB ivs-task-dns-track table with the initial values
        echo -e "${GREEN}Populating the Amazon DynamoDB ivs-task-dns-track table...${NC}"
        aws dynamodb batch-write-item --request-items file://json_configs/ivs_dynamodb_populate.json > /dev/null
    
    fi
}

function vpc_resources () {

    # This function will create the security group required by ivs-webrtc

    unset sg

    # Test if exists
    aws ec2 create-security-group --group-name ivs-sg --description "IVS WetRTC Security Group" --vpc-id $(aws ec2 describe-vpcs | jq '.Vpcs[] | select(.IsDefault)' | jq '.VpcId' | sed 's/"//g') > /dev/null 2>&1 && sg='OK' || sg='NOK'

    if [ sg = 'NOK' ]
    then
    
        #The Security Group'
        echo -e "${GREEN}Creating the ivs-sg security group...${NC}"
        aws ec2 create-security-group --group-name ivs-sg --description "IVS WetRTC Security Group" --vpc-id $(aws ec2 describe-vpcs | jq '.Vpcs[] | select(.IsDefault)' | jq '.VpcId' | sed 's/"//g') | jq '.GroupId' | sed 's/"//g'
        aws ec2 describe-security-groups | jq '.SecurityGroups[] | select(.GroupName=="ivs-sg")' | jq '.GroupId' | sed 's/"//g' > ./temp_files/ivs_sg.txt

        echo -e "${GREEN}Configuring ivs-sg security group...${NC}"
        while read line; do aws ec2 authorize-security-group-ingress --group-id $(cat ./temp_files/ivs_sg.txt) --protocol tcp --port $line --cidr 0.0.0.0/0; done < ./json_models/ivs_ports.txt

    else
    
        aws ec2 describe-security-groups | jq '.SecurityGroups[] | select(.GroupName=="ivs-sg")' | jq '.GroupId' | sed 's/"//g' > ./temp_files/ivs_sg.txt
    
        echo -e "${GREEN}Checking ivs-sg security group...${NC}"
        aws ec2 describe-security-groups | jq '.SecurityGroups[] | select(.GroupName=="ivs-sg")' | jq '.IpPermissions[] | select(.FromPort==80)' > /dev/null 2>&1 && ivs_http='OK' || ivs_http='NOK'
        aws ec2 describe-security-groups | jq '.SecurityGroups[] | select(.GroupName=="ivs-sg")' | jq '.IpPermissions[] | select(.FromPort==443)' > /dev/null 2>&1 && ivs_https='OK' || ivs_https='NOK'
        
        if [ ivs_http = 'NOK' ]
        then
        
            echo -e "${GREEN}Applying HTTP rule to ivs-sg security group...${NC}"
            aws ec2 authorize-security-group-ingress --group-id $(cat ./temp_files/ivs_sg.txt) --protocol tcp --port 80 --cidr 0.0.0.0/0
       
        else
    
            echo -e "${GREEN}HTTP rule is OK...${NC}"
        fi    
       
       if [ ivs_https = 'NOK' ]
       then
       
            echo -e "${GREEN}Applying HTTPS rule to ivs-sg security group...${NC}"
            aws ec2 authorize-security-group-ingress --group-id $(cat ./temp_files/ivs_sg.txt) --protocol tcp --port 433 --cidr 0.0.0.0/0
            
        else
            
            echo -e "${GREEN}HTTPS rule is OK...${NC}"
        
        fi

    fi
}

function fargate_resources () {

    # This function will create all fargate resources required by ivs-webrtc
    
    unset ivs_service
    
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

    ivs_service=$(aws ecs list-services --cluster ivs | sed -n -e '/.*ivs/p' | sed -e 's/ //g;s/"//g;s/,//g')
    
    if [ ! $ivs_service ]
    then
    
        #Creates the template ivs_ecs_service.json to be used by the Amazon ECS Server
        echo -e "${GREEN}Creating the template ivs_ecs_service.json to be used by the Amazon ECS Server...${NC}"
        store_sgid=$(cat ./temp_files/ivs_sg.txt) && store_subnets=$(sed -e 'N;s/\n//;N;s/\n//;N;s/\n//' ./temp_files/my_subnets.txt \
| sed -e 'N;s/\n//;s/ //g;s/[][]//g;s/^"//g;s/"$//g') && jq --arg v "$store_subnets" '.networkConfiguration.awsvpcConfiguration |= . + {"subnets":[$v]}' \
./json_models/ecs_services_model.json | jq --arg v "$store_sgid" '.networkConfiguration.awsvpcConfiguration |= . + {"securityGroups":[$v]}' \
| sed -e 's/\\//g' > ./json_configs/ivs_ecs_service.json

        #Creates the Amazon ECS service named ivs-webrtc
        echo -e "${GREEN}Creating the Amazon ECS service named ivs-webrtc...${NC}"
        aws ecs create-service --cli-input-json file://json_configs/ivs_ecs_service.json > /dev/null
    
    else
    
        error_exit "The ivs-webrtc does exist and cannot be automatically replaced! Try to delete it mannually and re-run this script."
        
    fi
}

function eventbridge_resources () {

    # This function will create all eventbridge resources required by ivs-webrtc
    
    unset lambda
    
    # Test if exists
    aws lambda get-function --function-name ivs-ip-register > /dev/null 2>&1 && lambda='OK' || lambda='NOK'

    #Configures the ivs_events_rule.json with the correct ivs service configured in Amazon ECS Cluster
    echo -e "${GREEN}Configuring the ivs_events_rule.json with the correct ivs service configured in Amazon ECS Cluster...${NC}"
    ecs_arn=$(cat ./temp_files/ecs_cluster_arn.txt) && sed -e "s@ARN_HERE@${ecs_arn}\\\@g" \
json_models/ivs_events_rule_model.json > ./json_configs/ivs_events_rule.json

    #Create the Amazon EventBridge rule named ip-register
    echo -e "${GREEN}Creating the Amazon EventBridge rule named ip-register...${NC}"
    aws events put-rule --cli-input-json file://json_configs/ivs_events_rule.json | jq '.RuleArn' | sed 's/"//g' > ./temp_files/ivs_event_rule_arn.txt

    if [ $lambda = 'OK' ]
    then
        
        unset lambda
        
        #Creating the resource policy template
        echo -e "${GREEN}Creating the resource policy template...${NC}"
        aws lambda get-function --function-name ivs-ip-register | jq '.Configuration.FunctionArn' | sed 's/"//g' > ./temp_files/ivs_lambda_function_arn.txt
        
        
        
        #Adding permission to ip-register rule invoke lambda funtion ivs-ip-register
        echo -e "${GREEN}Adding permission to ip-register rule invoke lambda funtion ivs-ip-register...${NC}"
        aws lambda add-permission --function-name ivs-ip-register --action lambda:InvokeFunction --statement-id events --principal events.amazonaws.com --source-arn=$(cat ./temp_files/ivs_event_rule_arn.txt) > /dev/null 2>&1 && lambda='OK' || lambda='NOK'
        
        if [ $lambda = 'NOK' ]
        then
        
            echo -e "${GREEN}Permission was already in place!${NC}"
        fi 

        #Add lambda function ivs-ip-register as a target to the event rule ip-register
        echo -e "${GREEN}Adding lambda function ivs-ip-register as a target to the event rule ip-register...${NC}"
        aws events remove-targets --rule ip-register --ids "1" > /dev/null
        aws events put-targets --rule ip-register --targets "Id"="1","Arn"="$(cat ./temp_files/ivs_lambda_function_arn.txt)" > /dev/null

    else
    
        error_exit 'Lambda ivs-ip-register not found! Please re-run ./backend deploy lambda'
        
    fi
    
}

function cloudwatchlogs_resources () {

    # This function create all cloudwatchlogs resources required by ivs-webrtc

    unset logs

    #Creating cloudwatch log group name for ivs-webrtc tasks
    echo -e "${GREEN}Creating cloudwatch log group name for ivs-webrtc tasks...${NC}"
    aws logs create-log-group --log-group-name /ecs/ivs-webrtc > /dev/null 2>&1 && logs='OK' || logs='NOK'
    
    if [ $logs = 'NOK' ]
    then
    
        echo -e "${GREEN}Log Group /ecs/ivs-webrtc OK!${NC}"
    fi 

}

function fargate_adjust_service () {

    # This function will adjust the fargate service ivs-webrtc from 0 to 2 tasks
    echo -e "${GREEN}Adjusting fargate service to 2 tasks...${NC}"
    aws ecs update-service --cluster ivs --service ivs-webrtc --desired-count 2 > /dev/null

    #echo -e "${GREEN}Deployment done!!!${NC}"
}

function error_exit () {
    
    echo -e "${RED}$1${NC}" 1>&2
    exit 1

}

function deploy () {

	# This function will receive a argument from the command line to start the cleaning process
	# It will be possible to uninstall everything or just pontual services
	
	option=$1
	
	case $option in
	all)
		iam_resources || { error_exit 'iam roles deployment failed!'; }
		lambda_resources || { error_exit 'lambda function deployment failed!'; }
		dynamodb_resources || { error_exit 'dynamodb table deployment failed!'; }
		vpc_resources || { error_exit 'security group deployment failed!'; }
		fargate_resources || { error_exit 'fargate deployment failed!'; }
		eventbridge_resources || { error_exit 'events deployment failed!'; }
		cloudwatchlogs_resources || { error_exit 'logs deployment failed!'; }
		fargate_adjust_service || { error_exit 'tasks deployment failed!'; }
		;;

	iam)
	    echo -e "${GREEN}###Deploying iam ivs-webrtc resources###${NC}"
		iam_resources
		;;
		
	lambda)
	    echo -e "${GREEN}###Deploying lambda ivs-webrtc resources###${NC}"
		lambda_resources
		;;
		
	dynamodb)
	    echo -e "${GREEN}###Deploying dynamodb ivs-webrtc resources###${NC}"
		dynamodb_resources
		;;
		
	sg)
	    echo -e "${GREEN}###Deploying security group ivs-webrtc resources###${NC}"
		vpc_resources
		;;

	fargate)
	    echo -e "${GREEN}###Deploying fargate ivs-webrtc resources###${NC}"
		fargate_resources
		;;

	events)
	    echo -e "${GREEN}###Deploying eventbridge ivs-webrtc resources###${NC}"
		eventbridge_resources
		;;
	
	logs)
	    echo -e "${GREEN}###Deploying cloudwatchlogs ivs-webrtc resources###${NC}"
		cloudwatchlogs_resources 
		;;
	
	tasks)
	    echo -e "${GREEN}###Deploying tasks ivs-webrtc resources###${NC}"
		fargate_adjust_service
		;;
	
	*)
		echo -e "${RED}This option is not valid!${NC}" 
		;;
esac

}
		
"$@"		