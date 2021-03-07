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

	# Check if the resource exist
	if [ $(aws events list-rules --name-prefix ip-register | jq '.Rules[0].Name') != "null" ]
	then
		if [ $(aws events list-targets-by-rule --rule ip-register | jq '.Targets[0].Id') != "null" ]
		then	
			echo -e "${GREEN}Deleting the EventBridge Rule: ip-register...${NC}"
			aws events remove-targets --rule ip-register --ids "1" 1> /dev/null
			
			if $(aws events delete-rule --name ip-register > /dev/null 2>&1);
			then
				echo -e "${GREEN}EventBridge Rule Deleted!${NC}"
			else
				error_exit "The EventBrige Rule cannot be automatically deleted because it has dependencies. You may want to try remove it manually."
			fi

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
	
	# Retrive the task definition version
	ivs_task_definition=$(aws ecs list-task-definitions | sed -n -e '/.*ivs/p' | sed -e 's/ //g;s/"//g;s/,//g' | sed 's/.*\(ivs.*\).*/\1/')
	
	# Test if exists
	service_status=$(aws ecs describe-services --cluster ivs --services ivs-webrtc | jq '.services[].status' | sed 's/"//g')
	ivs_cluster=$(aws ecs describe-clusters --cluster ivs | jq '.clusters[].status' | sed 's/"//g')

	if [ $(aws ecs describe-services --cluster ivs --services ivs-webrtc | jq '.services[0].desiredCount') != 0 ] && [ $(aws ecs describe-services --cluster ivs --services ivs-webrtc | jq '.services[0].desiredCount') != 'null' ]
	then
		echo -e "${GREEN}Eliminating tasks from ivs-webrtc service...${NC}"
		aws ecs update-service --cluster ivs --service ivs-webrtc --desired-count 0 >> /dev/null
		
		tasks=$(aws ecs list-tasks --cluster ivs | jq '.taskArns' | sed -n -e 's/^.*\///p' | sed 's/"//' | sed -e 'N;s/\n//;s/,/ /')
		
		# Waits the task stop
		aws ecs wait tasks-stopped --cluster ivs --tasks $tasks
		
		# Deletes de ivs-webrtc service
		ecs_service_delete
			
		if [ $ivs_task_definition ]
		then
			# De-register task definition ivs-webrtc
			echo -e "${GREEN}Deregistering task definition ivs-webrtc...${NC}"
			aws ecs deregister-task-definition --task-definition ${ivs_task_definition} >> /dev/null
		fi
		
		# Deletes the ivs cluster
		ecs_cluster_delete
	
		
	else
			# Deletes de ivs-webrtc service
			ecs_service_delete
				
			if [ $ivs_task_definition ]
			then
				# De-register task definition ivs-webrtc
				echo -e "${GREEN}Deregistering task definition ivs-webrtc...${NC}"
				aws ecs deregister-task-definition --task-definition ${ivs_task_definition} >> /dev/null
			fi
				
				# Deletes the ivs cluster
                ecs_cluster_delete
                
	fi
	
}

function security_group_deprov () {
	
	# This function deletes the security group ivs-sg

	# Test if the security group exists and save the result on security_group variable
	aws ec2 describe-security-groups --group-name ivs-sg > /dev/null 2>&1 && security_group='OK' || security_group='NOK'

	if [ $security_group = 'OK' ]
	then 

		echo -e "${GREEN}Deleting security group ivs-sg...${NC}"
		sleep 15
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
	
	
	##BEGIN
	###THIS SECTION WILL BE REMOVED CASE OSMAR INCLUDE LAMBDA AND DYNAMODB ON FRONTEND DEPLOYMENT
	
	# Test if it exists
	aws iam detach-role-policy --role-name ivs-lambda-role --policy-arn=$(cat ./temp_files/lambda_policy_arn.txt /dev/null 2>&1) > /dev/null 2>&1 && iam='OK' || iam='NOK'
	
	if [ $iam = 'OK' ]
	then
		echo -e "${GREEN}Detaching first policy from ivs-lambda-role...${NC}"
		aws iam detach-role-policy --role-name ivs-lambda-role --policy-arn=$(cat ./temp_files/lambda_policy_arn.txt) > /dev/null
	else
		echo -e "${RED}It seems you have already detached the policy from ivs-lambda-role!!!${NC}"
	fi
	
	# Test if it exists
	aws iam detach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole > /dev/null 2>&1 && iam='OK' || iam='NOK'	
	
	if [ $iam = 'OK' ]
	then
		echo -e "${GREEN}Detaching second policy from ivs-lambda-role...${NC}"
		aws iam detach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole > /dev/null
	else
		echo -e "${RED}It seems you have already detached the policy from ivs-lambda-role!!!${NC}"
	fi
	
	# Test if it exists
	aws iam detach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess > /dev/null 2>&1 && iam='OK' || iam='NOK'

	if [ $iam = 'OK' ]
	then
		echo -e "${GREEN}Detaching last policy from ivs-lambda-role...${NC}"
		aws iam detach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess > /dev/null

	else
		echo -e "${RED}It seems you have already detached the policy from ivs-lambda-role!!!${NC}"
	
	fi
	##END
	
	# Test if it exists
	aws iam detach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy > /dev/null 2>&1 && ecs='OK' || ecs='NOK'
	
	if [ $ecs = 'OK' ]
	then
	
		echo -e "${GREEN}Detaching first policy from ivs-ecs-execution-role...${NC}"
		aws iam detach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy > /dev/null
	else
		
		echo -e "${RED}It seems you have already detached the policy from ivs-ecs-execution-role!!!${NC}"
			
	fi
	
	# Test if it exists
	aws iam detach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/AWSOpsWorksCloudWatchLogs > /dev/null 2>&1 && ecs='OK' || ecs='NOK'
	
	if [ $ecs = 'OK' ]
	then
		echo -e "${GREEN}Detaching second policy from ivs-ecs-execution-role...${NC}"
		aws iam detach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/AWSOpsWorksCloudWatchLogs > /dev/null

	else
	
		echo -e "${RED}It seems you have already detached the policy from ivs-ecs-execution-role!!!${NC}"
		
	fi
	
	# Test if it exists
	aws iam delete-policy --policy-arn=$(cat ./temp_files/lambda_policy_arn.txt > /dev/null 2>&1) > /dev/null 2>&1 && lambda='OK' || lambda='NOK'
	
	if [ $lambda = 'OK' ]
	then
	
		echo -e "${GREEN}Deleting policy ivs_dynamodb...${NC}"
		aws iam delete-policy --policy-arn=$(cat ./temp_files/lambda_policy_arn.txt) > /dev/null
	
	else
		
		echo -e "${RED}It seems you have already deleted the ivs_dynamodb policy!!!${NC}"
	
	fi
	
	# Test if it exists
	aws iam delete-role --role-name ivs-lambda-role > /dev/null 2>&1 && iam='OK' || iam='NOK'
	
	if [ $iam = 'OK' ]
	then
	
		echo -e "${GREEN}Deleting role ivs-lambda-role...${NC}"
		aws iam delete-role --role-name ivs-lambda-role > /dev/null

	else 
		
		echo -e "${RED}It seems you have already deleted the ivs-lambda-role policy!!!${NC}"
		
	fi
	
	# Test if it exists
	aws iam delete-role --role-name ivs-lambda-role > /dev/null 2>&1 && ecs='OK' || ecs='NOK'
	
	if [ $ecs = 'OK' ]
	then
	
		echo -e "${GREEN}Deleting role ivs-ecs-execution-role...${NC}"
		aws iam delete-role --role-name ivs-ecs-execution-role > /dev/null
		
	else
	
		echo -e "${RED}It seems you have already deleted the ivs-ecs-execution-role policy!!!${NC}"
	
	fi
}

function cloudwatchlogs_deprov () {

	# This function will delete the cloudwatch log group /ecs/ivs-webrtc
	
	aws logs delete-log-group --log-group-name /ecs/ivs-webrtc > /dev/null 2>&1 && logs='OK' || logs='NOK'
	
	if [ $logs = 'OK' ]
	then
	
		echo -e "${GREEN}Deleting cloudwatch log group /ecs/ivs-webrtc...${NC}"
		aws logs delete-log-group --log-group-name /ecs/ivs-webrtc
	
	else
	
		echo -e "${RED}It seems you have already deleted the /ecs/ivs-webrtc log group!!!${NC}"
		
	fi
}

function delete_temp_files () {

	# This function will delete all temporary files that was created by ivs-webrtc during the deployment


	f_events='./json_configs/ivs_events_rule.json'
	f_service='./json_configs/ivs_ecs_service.json'
	f_subnets='./temp_files/my_subnets.txt'
	f_tasks='./json_configs/ivs_task_definition.json'
	f_ecs='./temp_files/ecs_cluster_arn.txt'
	f_sg='./temp_files/ivs_sg.txt'
	f_lambda='./json_configs/lambda.json'
	f_ecs_role='./temp_files/ivs_ecs_execution_role_arn.txt'
	f_lambda_policy='./temp_files/lambda_policy_arn.txt'
	f_lambda_function='./temp_files/ivs_lambda_function_arn.txt'
	f_events_rule='./temp_files/ivs_event_rule_arn.txt'
	
	if [ -f $f_events ]
	then
		
		echo -e "${GREEN}Deleting ${f_events}...${NC}"
		rm $f_events
		
	else 
	
		echo -e "${RED}File ${f_events} does not exist${NC}"
	
	fi
	
	if [ -f $f_service ]
	then
	
		echo -e "${GREEN}Deleting ${f_service}...${NC}"
		rm $f_service
		
	else 
	
		echo -e "${RED}File ${f_service} does not exist${NC}"
		
	fi
	
	if [ -f $f_subnets ]
	then
	
		echo -e "${GREEN}Deleting ${f_subnets}...${NC}"
		rm $f_subnets
	
	else
	
		echo -e "${RED}File ${f_subnets} does not exist${NC}"
	
	fi
	
	if [ -f $f_tasks ]
	then
	
		echo -e "${GREEN}Deleting ${f_tasks}...${NC}"
		rm $f_tasks
		
	else
	
		echo -e "${RED}File ${f_tasks} does not exist${NC}"
		
	fi
	
	if [ -f $f_ecs ]
	then
	
		echo -e "${GREEN}Deleting ${f_ecs}...${NC}"
		rm $f_ecs
	
	else
	
		echo -e "${RED}File ${f_ecs} does not exist${NC}"
		
	fi
	
	if [ -f $f_sg ]
	then
	
		echo -e "${GREEN}Deleting ${f_sg}...${NC}"
		rm $f_sg
		
	else
	
		echo -e "${RED}File ${f_sg} does not exist${NC}"
		
	fi
	
	if [ -f $f_lambda ]
	then
	
		echo -e "${GREEN}Deleting ${f_lambda}...${NC}"
		rm $f_lambda
		
	else
	
		echo -e "${RED}File ${f_lambda} does not exist${NC}"
		
	fi
	
	if [ -f $f_ecs_role ]
	then
		
		echo -e "${GREEN}Deleting ${f_ecs_role}...${NC}"
		rm $f_ecs_role
		
	else
	
		echo -e "${RED}File ${f_ecs_role} does not exist${NC}"
		
	fi
	
	if [ -f $f_lambda_policy ]
	then
		
		echo -e "${GREEN}Deleting ${f_lambda_policy}...${NC}"
		rm $f_lambda_policy
		
	else
	
		echo -e "${RED}File ${f_lambda_policy} does not exist${NC}"
		
	fi
	
	if [ -f $f_lambda_function ]
	then
		
		echo -e "${GREEN}Deleting ${f_lambda_function}...${NC}"
		rm $f_lambda_function
		
	else
		
		echo -e "${RED}File ${f_lambda_function} does not exist${NC}"
	
	fi
	
	if [ -f $f_events_rule ]
	then
	
		echo -e "${GREEN}Deleting ${f_events_rule}...${NC}"
		rm $f_events_rule
	
	else
	
		echo -e "${RED}File ${f_events_rule} does not exist${NC}"
		
	fi
}

function ecs_service_delete () {
	
	# This function deletes the ecs ivs-webrtc service
	
	if [ $ivs_cluster = 'ACTIVE' ] && [ $service_status = 'ACTIVE' ]
	then
	
		echo -e "${GREEN}Deleting service ivs-webrtc...${NC}"
		aws ecs delete-service --cluster ivs --service ivs-webrtc >> /dev/null
	else
	
		echo -e "${RED}It seems you have already deleted the ivs-webrtc service!!!${NC}"
	
	fi

}

function ecs_cluster_delete () {
	
	# This function deletes the ecs ivs-webrtc service
	if [ $ivs_cluster = 'ACTIVE' ]
	then
	
		echo -e "${GREEN}Deleting cluster ivs...${NC}"
		aws ecs delete-cluster --cluster ivs >> /dev/null
	else
	
		echo -e "${RED}It seems you have already deleted the ivs cluster!!!${NC}"
	
	fi

}

function error_exit () {
	
	# This function is used for error handling
	
	echo -e "${RED}$1${NC}" 1>&2
	exit 1
}

function clean () {

	# This function will receive a argument from the command line to start the cleaning process
	# It will be possible to uninstall everything or just pontual services
	
	option=$1
	
	case $option in
	all)
		echo -e "${GREEN}###Preparing to clean aws resources deployed by ivs-webrtc...###${NC}"
		eventbridge_deprov || { error_exit 'events deployment failed!'; }
		fargate_deprov || { error_exit 'fargate deployment failed!'; }
		security_group_deprov || { error_exit 'security group deployment failed!'; }
		dynamodb_deprov || { error_exit 'dynamodb table deployment failed!'; }
		iam_deprov || { error_exit 'iam roles deployment failed!'; }
		lambda_deprov || { error_exit 'lambda function deployment failed!'; }
		cloudwatchlogs_deprov || { error_exit 'logs deployment failed!'; }
		delete_temp_files || { error_exit 'deleting temporary files deployment failed!'; }
		;;
	
	events)
		echo -e "${GREEN}###Cleaning eventbridge ivs-webrtc resources###${NC}"
		eventbridge_deprov
		;;
	
	fargate)
		echo -e "${GREEN}###Cleaning fargate ivs-webrtc resources###${NC}"
		fargate_deprov
		;;
	
	sg)
		echo -e "${GREEN}###Cleaning security group ivs-webrtc resources###${NC}"
		security_group_deprov
		;;
	
	dynamodb)
		echo -e "${GREEN}###Cleaning dybamodb ivs-webrtc resources###${NC}"
		dynamodb_deprov
		;;
	
	lambda)
		echo -e "${GREEN}###Cleaning lambda ivs-webrtc resources###${NC}"
		lambda_deprov
		;;
	
	iam)
		echo -e "${GREEN}###Cleaning iam ivs-webrtc resources###${NC}"
		iam_deprov
		;;
	
	logs)
		echo -e "${GREEN}###Cleaning cloudwatchlogs ivs-webrtc resources###${NC}"
		cloudwatchlogs_deprov 
		;;
	
	files)
		echo -e "${GREEN}###Cleaning ivs-webrtc temporary files###${NC}"
		delete_temp_files
		;;
	
	*)
		echo -e "${RED}This option is not valid!${NC}" 
		;;
esac

}
		
"$@"		
		
