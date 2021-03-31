#!/bin/bash

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;93m'
NC='\033[0m'

# This is a very simples scrip that uses aws cli + jq + sed to clean your environment by removing all resources deploy by the install_ivs_backend.sh
# If you wish to remove specific resources, go to the boton of this file and comment the function calls you wish to avoid.

################################################################################
# Help                                                                         #
################################################################################

function help ()
{
   # Display Help
   echo -e "${GREEN}This script cleans your environment by removing all backend resources deployed by install_ivs_backend.sh"
   echo
   echo -e "Syntax: ./uninstall_ivs_backend.sh clean [ all | codebuild | codebuild_rp | s3 | ecr | codebuild | lambda | iam  | fargate | sg | events | events | logs | files ]${NC}"
   echo -e "${YELLOW}options:"
   echo -e "all            Cleans the whole environment by removing all resources installed by install_ivs_backend.sh"
   echo -e "codebuild      Removes the codebuild project"
   echo -e "codebuild_rp   Removes all roles and policies required by codebuild"
   echo -e "s3             Removes S3 bucket"
   echo -e "ecr            Removes the ECR repository"
   echo -e "lambda         Removes the lambda function"
   echo -e "iam            Removes all roles and policies required by lambda,dynamodb and fargate"
   echo -e "fargate        Removes ECS cluster, task definitions and services"
   echo -e "sg             Removes the segurity groups required by fargate"
   echo -e "events         Removes the eventbridge rules and triggers"
   echo -e "logs           Removes the cloudwatch log group"
   echo -e "files          Removes the tempoary files\n\n"

   echo -e "${GREEN}Example on how to use this script to deploy the whole backend at once"
   echo -e "./uninstall_ivs_backend.sh clean all${NC}\n\n"

   echo -e "${YELLOW}Case you prefer to deploy the backend step by step, deploy the each item following the order showing in this help"
   echo -e "Example:"
   echo -e "./uninstall_ivs_backend.sh clean codebuild"
   echo -e "./install_ivs_backend.sh deploy codebuild_rp"
   echo -e "./install_ivs_backend.sh deploy ecr"
   echo -e "...and so on...${NC}\n\n"


}

################################################################################
# Codebuild Deprovisiong                                                       #
################################################################################


function codebuild_deprov () {

	# This function deletes the codebuild project

	echo -e "${GREEN}Deleting Codebuild ivs-webrtc project...${NC}"
	aws codebuild delete-project --name ivs-webrtc > /dev/null 2>&1 && echo -e "${GREEN}Codebuild ivs-webrtc project deleted.${NC}" \
	|| echo -e "${RED}It seems you have already deleted the codebuild ivs-webrtc project!!!${NC}"

}

################################################################################
# Codebuild Roles and Policies Deprovisiong                                    #
################################################################################

function codebuild_rp_deprov () {

	# This deletes the roles and policies required by codebuild

	# Array that stores all policies arn that should be detached
	codebuild_policies=($(cat ./temp_files/ivs_codebuild_log_arn.txt) \
	$(cat ./temp_files/ivs_codebuild_s3_arn.txt) \
	$(cat ./temp_files/ivs_codebuild_vpc_arn.txt) \
	$(cat ./temp_files/ivs_codebuild_base_arn.txt) \
	$(cat ./temp_files/ivs_codebuild_ecr_arn.txt))

	# Array that stores all roles that should be deleted
	codebuild_roles_to_delete=('ivs-webrtc-codebuild-role')
	
	# Calls detach_policy passing the policies array as argument
	detach_policy ${codebuild_policies[@]} ivs-webrtc-codebuild-role

	# Calls delete_policy passing the policies array as argument
	delete_policy ${codebuild_policies[@]} 

	# Calls delete_role passing the policies array as argument
	delete_role ${codebuild_roles_to_delete[@]} 

	unset iam_role

}

################################################################################
# S3 Bucket Deprovisiong                                                       #
################################################################################

function s3_deprov () {

	# This function removes the S3 bucket required by codebuild

	# Captures the bucket name
	s3_bucket=$(cat ./temp_files/s3_bucket.txt)

	# Remove the bucket and all of its objects
	echo -e "${GREEN}Removing S3 ${s3_bucket} bucket and objects...${NC}"
	aws s3 rb s3://${s3_bucket} --force > /dev/null 2>&1 && echo -e "${GREEN}S3 Bucket ${s3_bucket} deleted${NC}" \
	|| echo -e "${RED}It seems that ${s3_bucket} bucket was already deleted!!!${NC}"
}

################################################################################
# ECR Deprovisiong                                                     		   #
################################################################################

function ecr_deprov () {

	# This function deletes the ECR repository required by codebuild

	echo -e "${GREEN}Removing ECR ivs-webrtc repository...${NC}"
	aws ecr delete-repository --repository-name ivs-webrtc --force > /dev/null 2>&1 && echo -e "${GREEN}ECR ivs-webrtc repository deleted${NC}" \
	|| echo -e "${RED}It seems that ivs-webrtc repository was already deleted!!!${NC}"

}


################################################################################
# EventBridge Deprovisiong                                                     #
################################################################################

function eventbridge_deprov () {
	
	# This function will remove the eventbridge rule named ip-register	

	echo -e "${GREEN}Deleting the EventBridge rules and targets...${NC}"

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

################################################################################
# Fargate Deprovisioning                                                       #
################################################################################

function fargate_deprov () {
	
	# Retrive the task definition version
	ivs_task_definition=($(aws ecs list-task-definitions | sed -n -e '/.*ivs/p' | sed -e 's/ //g;s/"//g;s/,//g' | sed 's/.*\(ivs.*\).*/\1/'))
	
	# Test if exists
	service_status=$(aws ecs describe-services --cluster ivs --services ivs-webrtc | jq '.services[].status' | sed 's/"//g')
	ivs_cluster=$(aws ecs describe-clusters --cluster ivs | jq '.clusters[].status' | sed 's/"//g')

	if [ $(aws ecs describe-services --cluster ivs --services ivs-webrtc | jq '.services[0].desiredCount') != 0 ] && [ $(aws ecs describe-services --cluster ivs --services ivs-webrtc | jq '.services[0].desiredCount') != 'null' ]
	then
		echo -e "${GREEN}Eliminating tasks from ivs-webrtc service...${NC}"
		aws ecs update-service --cluster ivs --service ivs-webrtc --desired-count 0 >> /dev/null
		
		tasks=$(aws ecs list-tasks --cluster ivs | jq '.taskArns' | sed -n -e 's/^.*\///p' | sed 's/"//' | sed -e 'N;s/\n//;s/,/ /')
		
		print_progress

		# Waits the task stop
		aws ecs wait tasks-stopped --cluster ivs --tasks $tasks
		
		# Deletes de ivs-webrtc service
		ecs_service_delete
			
		if [ ${ivs_task_definition[0]} ]
		then
			# De-register task definition ivs-webrtc
			deregister_task_definition
		fi
		
		# Deletes the ivs cluster
		ecs_cluster_delete
	
		
	else
			# Deletes de ivs-webrtc service
			ecs_service_delete
				
			if [ ${ivs_task_definition[0]} ]
			then
				# De-register task definition ivs-webrtc
				deregister_task_definition
			fi
				
				# Deletes the ivs cluster
                ecs_cluster_delete
                
	fi
	
}

################################################################################
# Security Group Deprovisioning                                                #
################################################################################

function security_group_deprov () {
	
	# This function deletes the security group ivs-sg

	# # Test if the security group exists and save the result on security_group variable
	aws ec2 describe-security-groups --group-name ivs-sg > /dev/null 2>&1 && security_group='OK' || security_group='NOK'

	if [ $security_group = 'OK' ]
	 then 

		echo -e "${GREEN}Deleting security group ivs-sg...${NC}"
		print_progress
		aws ec2 delete-security-group --group-name ivs-sg

	else

		echo -e "${RED}It seems you have already deleted the security group ivs-sg!!!${NC}"
	
	fi
}

################################################################################
# Lambda Deprovisioning                                                        #
################################################################################

function lambda_deprov () {

	# This function deletes the Lambda function ivs-ip-register

	# Removes the lambda function ivs-ip-register
	echo -e "${GREEN}Deleting Lambda function ivs-ip-register...${NC}"
	aws lambda delete-function --function-name ivs-ip-register > /dev/null 2>&1 && echo -e "${GREEN}Lambda function ivs-ip-register deleted${NC}" \
	|| echo -e "${RED}It seems you have already deleted the Lambda function ivs-ip-register!!!${NC}"

}

################################################################################
# IAM Deprovisioning                                                           #
################################################################################

function detach_policy () {

	# This function detaches policies from iam roles

	echo -e "${GREEN}Detaching policies...${NC}"

	# Iterate over the arguments and detaches policy by policy 
	for i in ${@}
	do

		# Go to next register case file does not exist
		if [ $i = 'ivs-webrtc-codebuild-role' ] || [ $i = 'ivs-lambda-role' ] || [ $i = 'ivs-ecs-execution-role' ]
		then 

			continue

		fi
		
		p_name=$(echo -e ${i} | sed 's:.*/::')
		
		# Detaches policies
		aws iam detach-role-policy --role-name ${@: -1} --policy-arn ${i} \
		> /dev/null 2>&1 && echo -e "${GREEN}Policy ${p_name} detached${NC}" \
		|| echo -e "${RED}It seems that ${p_name} was already detached!!!${NC}"

	done
}

function delete_policy () {

	# This function deletes policies

	echo -e "${GREEN}Deleting policies...${NC}"

	# Iterate over the arguments and detaches policy by policy
	for i in ${@}
	do

		# Go to next register case file does not exist
		if [ $i = 'ivs-webrtc-codebuild-role' ] || [ $i = 'ivs-lambda-role' ] || [ $i = 'ivs-ecs-execution-role' ]
		then 

			continue
			
		fi

		# Captures the name of the policies
    	r_name=$(echo -e ${i} | sed 's:.*/::')

		# Deletes policies
		aws iam delete-policy --policy-arn ${i} > /dev/null 2>&1 \
		&& echo -e "${GREEN}Policy ${r_name} deleted${NC}" \
		|| echo -e "${RED}It seems that ${r_name} was already deleted!!!${NC}"

	done

}

function delete_role () {

	# This function deletes roles

	echo -e "${GREEN}Deleting roles...${NC}"

	# Iterate over the arguments and deletes role by role
	for i in ${@}
	do

		# Go to next register case file does not exist

		aws iam delete-role --role-name ${i} > /dev/null 2>&1 \
		&& echo -e "${GREEN}Role ${i} deleted${NC}" \
		|| echo -e "${RED}It seems that ${i} role was already deleted!!!${NC}"

	done

}

function iam_deprov () {

	# This function will delete all IAM roles and policies created to ivs-webrtc project

	# Array that stores all policies arn that should be detached
	policies_lambda=($(cat ./temp_files/lambda_policy_arn.txt) "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
	"arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess")

	policies_ecs=("arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy" "arn:aws:iam::aws:policy/AWSOpsWorksCloudWatchLogs")

	# Array that stores all policies arn that should be deleted
	policies_to_delete=($(cat ./temp_files/lambda_policy_arn.txt))

	# Array that stores all roles
	roles_to_delete=('ivs-ecs-execution-role' 'ivs-lambda-role')
	
	# Calls detach_policy passing the policies array as argument
	detach_policy ${policies_lambda[@]} ivs-lambda-role

	# Calls detach_policy passing the policies array as argument
	detach_policy ${policies_ecs[@]} ivs-ecs-execution-role

	# Calls delete_policy passing the policies array as argument
	delete_policy ${policies_to_delete[@]} 

	# Calls delete_role passing the policies array as argument
	delete_role ${roles_to_delete[@]} 

	unset iam_role
	
}

################################################################################
# CloudWatch Log Group Deprovisioning                                          #
################################################################################

function cloudwatchlogs_deprov () {

	# This function will delete the cloudwatch log group /ecs/ivs-webrtc
	
	# Removes /ecs/ivs-webrtc log group
	echo -e "${GREEN}Deleting cloudwatch log groups...${NC}"
	aws logs delete-log-group --log-group-name /ecs/ivs-webrtc > /dev/null 2>&1 \
	&& echo -e "${GREEN}Cloudwatch log group /ecs/ivs-webrtc deleted.${NC}" \
	|| echo -e "${RED}It seems you have already deleted the /ecs/ivs-webrtc log group!!!${NC}"

	# Removes /aws/codebuild/ivs-webrtc log group
	aws logs delete-log-group --log-group-name /aws/codebuild/ivs-webrtc > /dev/null 2>&1 \
	&& echo -e "${GREEN}Cloudwatch log group /aws/codebuild/ivs-webrtc deleted.${NC}" \
	|| echo -e "${RED}It seems you have already deleted the /aws/codebuild/ivs-webrtc log group!!!${NC}"

	# Removes /aws/lambda/ivs-ip-register log group
	aws logs delete-log-group --log-group-name /aws/lambda/ivs-ip-register > /dev/null 2>&1 \
	&& echo -e "${GREEN}Cloudwatch log group /aws/lambda/ivs-ip-register deleted.${NC}" \
	|| echo -e "${RED}It seems you have already deleted the /aws/lambda/ivs-ip-register log group!!!${NC}"
	
}

################################################################################
# Clean Temporary Files                                                        #
################################################################################

function delete_temp_files () {

	# This function will delete all temporary files that was created by ivs-webrtc during the deployment

	files=('./json_configs/ivs_events_rule.json' './json_configs/ivs_ecs_service.json' './temp_files/my_subnets.txt' './json_configs/ivs_task_definition.json' \
	'./temp_files/ecs_cluster_arn.txt' './temp_files/ivs_sg.txt' './json_configs/lambda.json' './temp_files/ivs_ecs_execution_role_arn.txt' \
	'./temp_files/lambda_policy_arn.txt' './temp_files/ivs_lambda_function_arn.txt' './temp_files/ivs_event_rule_arn.txt' './temp_files/ecr_repository.txt' \
	'./temp_files/s3_bucket.txt' 'lambda.zip' './temp_files/ecr_repository.txt' './temp_files/s3_bucket.txt' './json_configs/ivs_codebuild_base_policy.json' \
	'./json_configs/ivs_codebuild_s3_policy.json' './json_configs/ivs_codebuild_log_policy.json' './json_configs/ivs_codebuild.json' './temp_files/codebuild_subnets.txt' \
	'./json_configs/ivs_codebuild_vpc_policy.json' './temp_files/ivs_webrtc_codebuild_role_arn.txt' './temp_files/ivs_codebuild_ecr_arn.txt' './temp_files/ivs_codebuild_base_arn.txt' \
	'./temp_files/ivs_codebuild_vpc_arn.txt' './temp_files/ivs_codebuild_s3_arn.txt' './temp_files/ivs_codebuild_log_arn.txt' './temp_files/ivs_codebuild_build.json' \
	'./temp_files/ecr_uri.txt' './temp_files/accountid.txt' './docker_files/docker.zip' ./temp_files/ivs_codebuild_arn.txt)

	delete_file ${files[@]}

}

################################################################################
# Deletes Fargate Service                                                      #
################################################################################

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

################################################################################
# Delete Files                                                                 #
################################################################################


function delete_file () {

	# This function deletes the temporary files

	# Runs delete to each file present in the array
	for i in ${@}
	do

		echo -e "${GREEN}Deleting ${i}...${NC}"
		rm ${i} > /dev/null 2>&1 && echo -e "${GREEN}File ${i} deleted.${NC}" \
		|| echo -e "${RED}File ${i} does not exist${NC}"
	done

}


################################################################################
# Delete ECS Cluster                                                           #
################################################################################

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

################################################################################
# Deletes ECS Task Definition                                                  #
################################################################################

function deregister_task_definition () {


	echo -e "${GREEN}Deregistering task definition ivs-webrtc...${NC}"
	for t in ${ivs_task_definition[@]};
	do
		aws ecs deregister-task-definition --task-definition ${t} >> /dev/null
	done
}

################################################################################
# Error handling                                                               #
################################################################################

function error_exit () {
	
	# This function is used for error handling
	
	echo -e "${RED}$1${NC}" 1>&2
	exit 1
}

################################################################################
# Progress bar                                                                 #
################################################################################

function print_progress () {

    # Print # on screen

    for i in {0..7}
    do
        sleep 2
        echo -n "#"
            
    done 

}

################################################################################
# Cleaning Options                                                             #
################################################################################

function clean () {

	# This function will receive a argument from the command line to start the cleaning process
	# It will be possible to uninstall everything or just pontual services
	
	option=$1
	
	case $option in
	all)
		echo -e "${GREEN}###Preparing to clean aws resources deployed by ivs-webrtc...###${NC}"
		codebuild_deprov || { error_exit 'Failed while removing codebuild project!'; }
		codebuild_rp_deprov || { error_exit 'Failed while removing codebuild roles and policies!'; }
		s3_deprov || { error_exit 'Failed while removing s3 bucket!'; }
		ecr_deprov || { error_exit 'Failed while removing ecr repository!'; }
		eventbridge_deprov || { error_exit 'Failed while removing eventbridge rules and triggers!'; }
		fargate_deprov || { error_exit 'Failed while removing Fargate ECS resources!'; }
		security_group_deprov || { error_exit 'Failed while removing security groups'; }
		#dynamodb_deprov || { error_exit 'dynamodb table deployment failed!'; }
		iam_deprov || { error_exit 'Failed while removing iam roles and policies'; }
		lambda_deprov || { error_exit 'Failed while removing lambda resources'; }
		cloudwatchlogs_deprov || { error_exit 'Failed while removing cloudwatch log group!'; }
		#delete_temp_files || { error_exit 'Failed while removing temporary files!'; }
		echo -e "${YELLOW}If you dont see any errors, run the command below to delete the temporary files${NC}"
		echo -e "${GREEN}./uninstall_ivs_backend.sh clean files${NC}"
		;;
	
	codebuild)
		echo -e "${GREEN}###Cleaning codebuild ivs-webrtc project###${NC}"
		codebuild_deprov
		;;
	
	codebuild_rp)
		echo -e "${GREEN}###Cleaning codebuild roles and policies###${NC}"
		codebuild_rp_deprov
		;;
	s3)
		echo -e "${GREEN}###Cleaning S3 resources###${NC}"
		s3_deprov
		;;		
	ecr)
		echo -e "${GREEN}###Cleaning ECR resources###${NC}"
		ecr_deprov
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

# Enables script arguments	
"$@"	


# Prints help in case of calling the script without arguments		
if [ -z $1 ]
then 

    help
fi