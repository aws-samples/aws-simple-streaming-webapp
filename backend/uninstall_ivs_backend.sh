#!/bin/bash

# This is a simple script to help you clean all resources created by ivs-webrtc deployment.
# You can use this script to remove all resources or you can select what you want to remove.
# If you wish to remove specific resources, go to the boton of this file and comment the function calls you wish to avoid.

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'


function eventbridge_deprov () {
	
	# This function will remove the eventbridge rule named ip-register	

	echo -e "${GREEN}Deleting the EventBridge Rule: ip-register...${NC}"	

	# Check if the resource exist
	if [ $(aws events list-rules --name-prefix ip-register | jq '.Rules[0].Name') != "null" ]
	then
		if [ $(aws events list-targets-by-rule --rule ip-register | jq '.Targets[0].Id') != "null" ]
		then	

			aws events remove-targets --rule ip-register --ids "1" 
			aws events delete-rule --name ip-register

		else

			echo -e "${RED}Hmm...It seems you have already deleted the target...${NC}"
			echo -e "${RED}I will try to delete the event-rule then...${NC}"
			aws events delete-rule --name ip-register

		fi

	else

		echo -e "${RED}It seems you have already deleted the ip-register rule!!!${NC}"
	fi
}

function fargate_deprov () {

	if [ $(aws ecs describe-services --cluster ivs --services ivs-webrtc | jq '.services[0].desiredCount') != 0 ]
	then
		echo -e "${GREEN}Eliminating tasks from ivs-webrtc service...${NC}"
		aws ecs update-service --cluster ivs --service ivs-webrtc --desired-count 0 >> /dev/null

		# We should give time to fargate finish its tasks
		sleep 30

		echo -e "${GREEN}Deleting service ivs-webrtc...${NC}"
		aws ecs delete-service --cluster ivs --service ivs-webrtc >> /dev/null
		
		echo -e "${GREEN}Deregistering task definition ivs-webrtc...${NC}"
		aws ecs deregister-task-definition --task-definition ivs-webrtc:1 >> /dev/null
		
		echo -e "${GREEN}Deleting cluster ivs...${NC}"
		aws ecs delete-cluster --cluster ivs >> /dev/null

	else
	
		echo -e "${GREEN}Deleting service ivs-webrtc...${NC}"
                aws ecs delete-service --cluster ivs --service ivs-webrtc >> /dev/null

                echo -e "${GREEN}Deregistering task definition ivs-webrtc...${NC}"
                aws ecs deregister-task-definition --task-definition ivs-webrtc:1 >> /dev/null

                echo -e "${GREEN}Deleting cluster ivs...${NC}"
                aws ecs delete-cluster --cluster ivs >> /dev/null	
	fi
}

function security_group_deprov () {
	
	# This function deletes the security group ivs-sg

	# Test if the security group exists and save the result on security_group variable
	aws ec2 describe-security-groups --group-name ivs-sg > /dev/null 2>&1 && security_group='OK' || security_group='NOK'

	Sleep 15

	if [ $security_group = 'OK' ]
	then 

		echo -e "${GREEN}Deleting security group ivs-sg...${NC}"
		aws ec2 delete-security-group --group-name ivs-sg

	else

		echo -e "${RED}It seems you have already deleted the security group ivs-sg!!!${NC}"
	
	fi
}

function dynamodb_deprov () {

	# This function deletes the DynamoDB Table ivs-task-dns-track

	# Test if the table ivs-task-dns-track exist and save the result on dynamodb_table variable
	aws dynamodb describe-table --table ivs-task-dns-track > /dev/null 2>&1 && dynamodb_table='OK' || dynamodb_table='NOK'

	if [ $dynamodb_table = 'OK' ]
	then
		
		echo -e "${GREEN}Deleting DynamoDB Table ivs-task-dns-track...${NC}"
		aws dynamodb delete-table --table-name ivs-task-dns-track > /dev/null

	else

		echo -e "${RED}It seems you have already deleted the DynamoDB Table ivs-task-dns-track!!!${NC}"

	fi	
}

function lambda_deprov () {

	# This function deletes the Lambda function ivs-ip-register

	# Test if the lambda function ivs-ip-register exist and save the result on lambda_function variable
	aws lambda get-function --function ivs-ip-register > /dev/null 2>&1 && lambda_function='OK' || lambda_function='NOK'

	if [ $lambda_function = 'OK' ]
	then

		echo -e "${GREEN}Deleting Lambda function ivs-ip-register...${NC}"
		aws lambda delete-function --function-name ivs-ip-register
	
	else

		echo -e "${RED}It seems you have already deleted the Lambda function ivs-ip-register!!!${NC}"
	
	fi
}

function iam_deprov () {

	# This function will delete all IAM roles and policies created to ivs-webrtc project

	echo -e "${GREEN}Detaching policies from ivs-lambda-role...${NC}"
	aws iam detach-role-policy --role-name ivs-lambda-role --policy-arn=$(cat ./temp_files/lambda_policy_arn.txt) > /dev/null
	aws iam detach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole > /dev/null
	aws iam detach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess > /dev/null

	echo -e "${GREEN}Detaching policies from ivs-ecs-execution-role...${NC}"
	aws iam detach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy > /dev/null
	aws iam detach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/AWSOpsWorksCloudWatchLogs > /dev/null

	echo -e "${GREEN}Deleting policy ivs_dynamodb...${NC}"
	aws iam delete-policy --policy-arn=$(cat ./temp_files/lambda_policy_arn.txt) > /dev/null

	echo -e "${GREEN}Deleting role ivs-lambda-role...${NC}"
	aws iam delete-role --role-name ivs-lambda-role > /dev/null

	echo -e "${GREEN}Deleting role ivs-ecs-execution-role...${NC}"
	aws iam delete-role --role-name ivs-ecs-execution-role > /dev/null

}

function cloudwatchlogs_deprov () {

	# This function will delete the cloudwatch log group /ecs/ivs-webrtc
	echo -e "${GREEN}Deleting cloudwatch log group /ecs/ivs-webrtc...${NC}"
	aws logs delete-log-group --log-group-name /ecs/ivs-webrtc
	
}

function delete_temp_files () {

	# This function will delete all temporary files that was created by ivs-webrtc during the deployment


	echo -e "${GREEN}eleting all temporary files during the deployment...${NC}"
	rm ./json_configs/ivs_events_rule.json
	rm ./json_configs/ivs_ecs_service.json
	rm ./temp_files/my_subnets.txt
	rm ./json_configs/ivs_task_definition.json
	rm ./temp_files/ecs_cluster_arn.txt
	rm ./temp_files/ivs_sg.txt
	rm ./json_configs/lambda.json
	rm ./temp_files/ivs_ecs_execution_role_arn.txt
	rm ./temp_files/lambda_policy_arn.txt
	rm ./temp_files/ivs_lambda_function_arn.txt

	echo -e "${GREEN}All done!!!${NC}"
}

# This will delete all ivs-webrtc eventbridge resoruces
eventbridge_deprov

# This will delete all ivs-webrtc fargate resoruces
fargate_deprov

# This will delete all ivs-webrtc security group resoruces
security_group_deprov

# This will delete all ivs-webrtc dynamodb resources
dynamodb_deprov

# This will delete all ivs-webrtc lambda resources
lambda_deprov

# This will delete all ivs-webrtc iam resources
iam_deprov

# This will delete all ivs-webrc cloudwatlogs resources
cloudwatchlogs_deprov 

# This will delete all temporary files created during the deployment
delete_temp_files