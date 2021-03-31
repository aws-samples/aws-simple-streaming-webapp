#!/bin/bash

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;93m'
NC='\033[0m'

# This is a very simples scrip that uses aws cli + jq + sed to deploy the backend of aws-simples-streaming-app. You could easly deploy the whole back end by inserting individual commands
# but it would consume more of your time. The script will allow you to save time during the deployment.


################################################################################
# Help                                                                         #
################################################################################

function help ()
{
   # Display Help
   echo -e "${GREEN}This script deploys the backend of the aws-simple-streaming app."
   echo
   echo -e "Syntax: ./install_ivs_backend.sh deploy [ all | ecr | s3 | templates | codebuild_rp | codebuild | iam | lambda | dynamodb | sg | fargate | events | logs | tasks ]${NC}"
   echo -e "${YELLOW}options:"
   echo -e "all            Deploys the whole backend at once"
   echo -e "ecr            Creates the ecr repository"
   echo -e "s3             Creates s3 bucket and upload the docker files"
   echo -e "templates      Prepares the templates files for codebuild configuration"
   echo -e "codebuild_rp   Prepares all roles and policies required by codebuild"
   echo -e "codebuild      Creates the codebuild project and build the container images"
   echo -e "iam            Prepares all roles and policies required by lambda,dynamodb and fargate"
   echo -e "lambda         Creates the lambda function"
   echo -e "dynamodb       Check if the dynamodb table exists and populate it with initial values"
   echo -e "sg             Creates the segurity groups required by fargate"
   echo -e "fargate        Configures ECS cluster, task definitions and services"
   echo -e "events         Configures the eventbridge rules and triggers"
   echo -e "tasks          Configures ECS service to start 2 tasks${NC}\n\n"

   echo -e "${GREEN}Example on how to use this script to deploy the whole backend at once"
   echo -e "./install_ivs_backend.sh deploy all${NC}\n\n"

   echo -e "${YELLOW}Case you prefer to deploy the backend step by step, deploy the each item following the order showing in this help"
   echo -e "Example:"
   echo -e "./install_ivs_backend.sh deploy ecr"
   echo -e "./install_ivs_backend.sh deploy s3"
   echo -e "./install_ivs_backend.sh deploy templates"
   echo -e "...and so on...${NC}\n\n"


}

################################################################################
# ECR Resources                                                                #
################################################################################

function ecr_resources () {

    # This function will create the ECR repository required by ivs-webrtc

    # Test if it exists
    aws ecr describe-repositories --repository-names ivs-webrtc > /dev/null 2>&1 && ecr='OK' || ecr='NOK'

    if [ $ecr = 'NOK' ]
    then
        
        echo -e "${GREEN}Creating ECR ivs-webrtc repository...${NC}"
        aws ecr create-repository --repository-name ivs-webrtc >  ./temp_files/ecr_repository.txt
        jq '.repository.registryId' ./temp_files/ecr_repository.txt | sed 's/"//g' > ./temp_files/accountid.txt
        jq '.repository.repositoryUri' ./temp_files/ecr_repository.txt | sed 's/"//g' > ./temp_files/ecr_uri.txt

    else

        echo -e "${GREEN}ECR repository already exists. Capturing the registryId...${NC}"
        aws ecr describe-repositories --repository-names ivs-webrtc > ./temp_files/ecr_repository.txt
        jq '.repositories[0].registryId' ./temp_files/ecr_repository.txt | sed 's/"//g' > ./temp_files/accountid.txt
        jq '.repositories[0].repositoryUri' ./temp_files/ecr_repository.txt | sed 's/"//g' > ./temp_files/ecr_uri.txt

    fi

    unset ecr

}

################################################################################
# S3 Resources                                                                 #
################################################################################

function s3_resources () {

    # This function creates a s3 bucket to store the files required by codebuild

    # Creates a token
    token=$(uuidgen | sed -n 's/.*-//;p' | sed y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/ )

    # Creates a bucket
    aws s3 mb s3://ivs-webrtc-codebuild-${token} > /dev/null 2>&1 && s3='OK' || s3='NOK'

    copy_ready='NOK'

    if [ $s3 = 'NOK' ]
    then

        # Creates the S3 bucket
        echo -e "${GREEN}Creating S3 bucket...${NC}"
        token=$(uuidgen | sed -n 's/.*-//;p' | sed y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/ )
        aws s3 mb s3://ivs-webrtc-codebuild-${token} > /dev/null 2>&1 && s3='OK' || s3='NOK'
        echo "ivs-webrtc-codebuild-${token}" > ./temp_files/s3_bucket.txt
        copy_ready='OK'
    
    else

        # Case bucket already exists, it saves its name in ./temp_files/s3_bucket.txt
        echo -e "${GREEN}It seems that bucket ivs-webrtc-codebuild-${token} already exists. Capturing the details...${NC}" 
        echo "ivs-webrtc-codebuild-${token}" > ./temp_files/s3_bucket.txt
        copy_ready='OK'

    fi

    unset s3

    if [ $copy_ready = 'OK' ]
    then
        
        # Zip dockerfiles and dependencies and copy them to s3 bucket
        echo -e "${GREEN}Generating docker.zip and upload to ivs-webrtc-codebuild-${token} bucket...${NC}"
        cd ./docker_files/
        echo -e "${GREEN}Compacting files into docker.zip...${NC}"
        zip -r docker.zip *
        cd ..
        echo -e "${GREEN}Uploading docker.zip to ivs-webrtc-codebuild-${token} bucket...${NC}"
        aws s3 cp ./docker_files/docker.zip s3://ivs-webrtc-codebuild-${token}
    fi

}

################################################################################
# Codebuild Templates                                                          #
################################################################################

function codebuild_adjust_templates () {

    # This function adjust the json_model templates required by codebuild deployment

    # Capture the subnet that will be used by codebuild project
    replace_subnets=($(aws ec2 describe-subnets --filter Name=vpc-id,Values=$(aws ec2 describe-vpcs | jq '.Vpcs[] | select(.IsDefault)' | jq '.VpcId' | sed 's/"//g') --query 'Subnets[?MapPublicIpOnLaunch==`true`].SubnetId' | sed -e 's/\[//g;s/\]//g;s/ //g;s/"//g;s/,//g;1d;$ d' | sed -e :a -e ';$!N;s/\n/ /;ta')) > ./temp_files/codebuild_subnets.txt

    ### BEGIN - EXEMPTION THIS SHOULD BE HERE
    # Test if exists
    aws iam get-role --role-name ivs-webrtc-codebuild-role > /dev/null 2>&1 && codebuild='OK' || codebuild='NOK'

    if [ $codebuild = 'NOK' ]
    then

        # Create the AWS Codebuild role that will be used on our Codebuild Project
        echo -e "${GREEN}Creating AWS Codebuild role...${NC}"
        aws iam create-role --role-name ivs-webrtc-codebuild-role --assume-role-policy-document file://json_configs/ivs_webrtc_codebuild_trust_policy.json | jq '.Role.Arn' | sed 's/"//g' > ./temp_files/ivs_webrtc_codebuild_role_arn.txt
    
    else

        # If Codebuild role exist already, save its Arn in ./temp_files/ivs_webrtc_codebuild_role_arn.txt
        aws iam get-role --role-name ivs-webrtc-codebuild-role | jq '.Role.Arn' | sed 's/"//g' > ./temp_files/ivs_webrtc_codebuild_role_arn.txt

    fi
    

    unset codebuild
    ### BEGIN - EXEMPTION THIS SHOULD BE HERE

    # Variables that will be used to replace the values in json_model templates
    replace_accountid=$(cat ./temp_files/accountid.txt) 
    replace_location=$(cat ./temp_files/s3_bucket.txt)/docker.zip
    replace_bucket=$(cat ./temp_files/s3_bucket.txt)
    replace_kms="arn:aws:kms:us-east-1:${replace_accountid}:alias/aws/s3"
    replace_role=$(cat ./temp_files/ivs_webrtc_codebuild_role_arn.txt)

    # This will generate the ./json_configs/ivs_codebuild.json from the template ./json_models/ivs_codebuild_model.json
    jq --arg a "$replace_accountid" --arg l "$replace_location" --arg r "$replace_role" --arg k "$replace_kms" '.environment.environmentVariables[1].value = $a | .source.location = $l | .serviceRole = $r | .encryptionKey = $k ' ./json_models/ivs_codebuild_model.json > ./json_configs/ivs_codebuild.json

    # This will generate the ./json_configs/ivs_codebuild_base_policy.json from the template ./json_models/ivs_codebuild_base_policy_model.json 
    sed -e "s/REPLACE_ACCOUNTID/$replace_accountid/g" ./json_models/ivs_codebuild_base_policy_model.json > ./json_configs/ivs_codebuild_base_policy.json
    
    # This will generate the ./json_configs/ivs_codebuild_s3_policy.json from the template ./json_models/ivs_codebuild_s3_policy_model.json
    sed -e "s/REPLACE_BUCKET/$replace_bucket/g" ./json_models/ivs_codebuild_s3_policy_model.json > ./json_configs/ivs_codebuild_s3_policy.json

    # This will generate the ./json_configs/ivs_codebuild_log_policy.json from the template ./json_models/ivs_codebuild_log_policy_model.json
    sed -e "s/REPLACE_ACCOUNTID/$replace_accountid/g" ./json_models/ivs_codebuild_log_policy_model.json > ./json_configs/ivs_codebuild_log_policy.json

    # This will generate the
    sed -e "s/REPLACE_ACCOUNTID/$replace_accountid/g;s/REPLACE_SUBNET0/${replace_subnets[0]}/g;s/REPLACE_SUBNET1/${replace_subnets[1]}/g;s/REPLACE_SUBNET2/${replace_subnets[2]}/g;" ./json_models/ivs_codebuild_vpc_policy_model.json > ./json_configs/ivs_codebuild_vpc_policy.json
}

################################################################################
# Codebuild Roles and Policies                                                 #
################################################################################

function codebuild_iam () {

    # Test if exists
    codebuild=$(aws iam list-policies --scope Local | jq '.Policies[] | select(.PolicyName=="ivs_codebuild_ecr")' | jq '.Arn' | sed 's/"//g')

    # If the policy do not exist, it should be created..Otherwise, it will just attach the policy
    if [ ! $codebuild ]
    then
        
        echo -e "${GREEN}Attaching ivs_codebuild_ecr policy to AWS Codebuild role...${NC}"
        aws iam create-policy --policy-name ivs_codebuild_ecr --policy-document file://json_configs/ivs_codebuild_ecr_policy.json | jq '.Policy.Arn' | sed 's/"//g' > ./temp_files/ivs_codebuild_ecr_arn.txt
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $(cat ./temp_files/ivs_codebuild_ecr_arn.txt)
        
    else
        
        echo -e "${GREEN}Attaching ivs_codebuild_ecr policy to AWS Codebuild role...${NC}"
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $codebuild
    
    fi

    unset codebuild

    # Test if exists
    codebuild=$(aws iam list-policies --scope Local | jq '.Policies[] | select(.PolicyName=="ivs_codebuild_base")' | jq '.Arn' | sed 's/"//g')

    # If the policy do not exist, it should be created..Otherwise, it will just attach the policy
    if [ ! $codebuild ]
    then
        
        echo -e "${GREEN}Attaching ivs_codebuild_base policy to AWS Codebuild role...${NC}"
        aws iam create-policy --policy-name ivs_codebuild_base --policy-document file://json_configs/ivs_codebuild_base_policy.json | jq '.Policy.Arn' | sed 's/"//g' > ./temp_files/ivs_codebuild_base_arn.txt
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $(cat ./temp_files/ivs_codebuild_base_arn.txt)
        
    else
        
        echo -e "${GREEN}Attaching ivs_codebuild_base policy to AWS Codebuild role...${NC}"
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $codebuild
    
    fi

    unset codebuild

    # Test if exists
    codebuild=$(aws iam list-policies --scope Local | jq '.Policies[] | select(.PolicyName=="ivs_codebuild_vpc")' | jq '.Arn' | sed 's/"//g')

    # If the policy do not exist, it should be created..Otherwise, it will just attach the policy
    if [ ! $codebuild ]
    then
        
        echo -e "${GREEN}Attaching ivs_codebuild_vpc policy to AWS Codebuild role...${NC}"
        aws iam create-policy --policy-name ivs_codebuild_vpc --policy-document file://json_configs/ivs_codebuild_vpc_policy.json | jq '.Policy.Arn' | sed 's/"//g' > ./temp_files/ivs_codebuild_vpc_arn.txt
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $(cat ./temp_files/ivs_codebuild_vpc_arn.txt)
        
    else
        
        echo -e "${GREEN}Attaching ivs_codebuild_vpc policy to AWS Codebuild role...${NC}"
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $codebuild
    
    fi

    unset codebuild

    # Test if exists
    codebuild=$(aws iam list-policies --scope Local | jq '.Policies[] | select(.PolicyName=="ivs_codebuild_s3")' | jq '.Arn' | sed 's/"//g')

    # If the policy do not exist, it should be created..Otherwise, it will just attach the policy
    if [ ! $codebuild ]
    then
        
        echo -e "${GREEN}Attaching ivs_codebuild_s3 policy to AWS Codebuild role...${NC}"
        aws iam create-policy --policy-name ivs_codebuild_s3 --policy-document file://json_configs/ivs_codebuild_s3_policy.json | jq '.Policy.Arn' | sed 's/"//g' > ./temp_files/ivs_codebuild_s3_arn.txt
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $(cat ./temp_files/ivs_codebuild_s3_arn.txt)
        
    else
        
        echo -e "${GREEN}Attaching ivs_codebuild_s3 policy to AWS Codebuild role...${NC}"
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $codebuild
    
    fi

    unset codebuild

    # Test if exists
    codebuild=$(aws iam list-policies --scope Local | jq '.Policies[] | select(.PolicyName=="ivs_codebuild_log")' | jq '.Arn' | sed 's/"//g')

    # If the policy do not exist, it should be created..Otherwise, it will just attach the policy
    if [ ! $codebuild ]
    then
        
        echo -e "${GREEN}Attaching ivs_codebuild_log policy to AWS Codebuild role...${NC}"
        aws iam create-policy --policy-name ivs_codebuild_log --policy-document file://json_configs/ivs_codebuild_log_policy.json | jq '.Policy.Arn' | sed 's/"//g' > ./temp_files/ivs_codebuild_log_arn.txt
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $(cat ./temp_files/ivs_codebuild_log_arn.txt)
        
    else
        
        echo -e "${GREEN}Attaching ivs_codebuild_log policy to AWS Codebuild role...${NC}"
        aws iam attach-role-policy --role-name ivs-webrtc-codebuild-role --policy-arn $codebuild
    
    fi

    unset codebuild
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
# Codebuild Resources                                                          #
################################################################################

function codebuild_resources () {

# Create codebuild project

    aws codebuild create-project --name ivs-webrtc --cli-input-json file://json_configs/ivs_codebuild.json > /dev/null 2>&1 

    build_current_phase='NOT_STARTED'
  
    aws codebuild start-build --project-name ivs-webrtc > ./temp_files/ivs_codebuild_build.json
    ivs_build=$(jq '.build.id' ./temp_files/ivs_codebuild_build.json | sed 's/"//g')

    echo -e "${GREEN}Creating the container image${NC}"

    print_progress

    while true
    do
        build_status=$(aws codebuild batch-get-builds --ids $ivs_build | jq '.builds[0].currentPhase' | sed 's/"//g')
        
        if [ $build_status = 'PROVISIONING' ]
        then

            echo -e "${YELLOW}${build_status}${NC}"
            print_progress

        elif [ $build_status = 'PRE_BUILD' ]
        then

            echo -e "${YELLOW}${build_status}${NC}"
            print_progress

        elif [ $build_status = 'BUILD' ]
        then

            echo -e "${YELLOW}${build_status}${NC}"
            print_progress

        elif [ $build_status = 'POST_BUILD' ]
        then

            echo -e "${YELLOW}${build_status}${NC}"
            print_progress

        elif [ $build_status = 'FINALIZING' ]
        then

            echo -e "${YELLOW}${build_status}${NC}"
            print_progress

        elif [ $build_status = 'COMPLETED' ]
        then

            echo -e "${YELLOW}${build_status}${NC}"
            break

        elif [ $build_status = 'FALIED' ]
        then

            echo -e "${RED}${build_status}!!!${NC}"
            echo -e "${RED}Please, have a look at cloudwatch logs to understand why the codebuild failed, fix it and re-run the deployment.${NC}"

        else 
            echo -e "${RED}${build_status}!!!${NC}"
            echo -e "${RED}Something went wrong...Please hava a look at cloudwatchlogs to understand what happened.${NC}"
            break

        fi
    
    done

}

################################################################################
# IAM Roles and Policies - ECS/LAMBDA/DYNAMODB                                 #
################################################################################

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
    aws iam attach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 
    aws iam attach-role-policy --role-name ivs-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/AWSOpsWorksCloudWatchLogs

    # Test if exists
    aws iam get-role --role-name ivs-lambda-role > /dev/null 2>&1 && iam='OK' || iam='NOK'
    
    if [ $iam = 'NOK' ]
    then
    
        # Create the AWS Lambda execution role that will allow lambda to access the required AWS resources.
        echo -e "${GREEN}Creating the AWS Lambda execution role that will allow lambda to access the required AWS resources${NC}"
        aws iam create-role --role-name ivs-lambda-role --assume-role-policy-document file://json_configs/ivs_lambda_trust_policy.json > /dev/null

    fi
    
    unset iam
    
    # Attach the required policies to AWS Lambda execution role you just created.
    echo -e "${GREEN}Attaching AWSLambdaBasicExecutionRole policy to AWS Lambda execution role...${NC}"
    aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    echo -e "${GREEN}Attaching AmazonEC2ReadOnlyAccess policy to AWS Lambda execution role...${NC}"
    aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess 
    
    iam=$(aws iam list-policies --scope Local | jq '.Policies[] | select(.PolicyName=="ivs_dynamodb")' | jq '.Arn' | sed 's/"//g')
    
    # If the policy do not exist, it should be created..Otherwise, it will just attach the policy
    if [ ! $iam ]
    then
        
        echo -e "${GREEN}Attaching ivs_dynamodb policy to AWS Lambda execution role...${NC}"
        aws iam create-policy --policy-name ivs_dynamodb --policy-document file://json_configs/ivs_lambda_dynamodb_policy.json | jq '.Policy.Arn' | sed 's/"//g' > ./temp_files/lambda_policy_arn.txt
        aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn $(cat ./temp_files/lambda_policy_arn.txt)
        
    else
        
        echo -e "${GREEN}Attaching ivs_dynamodb policy to AWS Lambda execution role...${NC}"
        aws iam attach-role-policy --role-name ivs-lambda-role --policy-arn $(aws iam list-policies --scope Local | jq '.Policies[] | select(.PolicyName=="ivs_dynamodb")' | jq '.Arn' | sed 's/"//g')
    
    fi
        
}


################################################################################
# Lambda Resources                                                             #
################################################################################

function lambda_resources () {
    
    unset lambda

    # This function will create all lambda resources required by ivs-webrtc
    
    #Test if exists
    aws iam get-role --role-name ivs-lambda-role > /dev/null 2>&1 && lambda='OK' || lambda='NOK'
    
    if [ $lambda = 'OK' ]
    then
    
        #Creates lambda.json with our lambda configuration
        echo -e "${GREEN}Creating the lambda.json with our lambda configuration...${NC}"
        lambda_role_arn=$(aws iam get-role --role-name ivs-lambda-role | jq '.Role.Arn' | sed 's/"//g')
        jq --arg v "$lambda_role_arn" '. |= . + {"Role":$v}' ./json_models/lambda_model.json > ./json_configs/lambda.json

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
        zip lambda.zip lambda_function.py
        aws lambda create-function --cli-input-json file://json_configs/lambda.json --zip-file fileb://lambda.zip > /dev/null
    fi
}

################################################################################
# DynamoDB Resources                                                           #
################################################################################

function dynamodb_resources () {

    # Ths function will create all dynamodb resources required by ivs-webrtc

    table=$(aws dynamodb list-tables | sed -n -e '/.*ivs/p' | sed -e 's/ //g;s/"//g;s/,//g')
    
    if [ ! -z $table ]
    then

        #Creates the Amazon DynamoDB ISS-task-dns-track-dev table
        echo -e "${GREEN}Creating the Amazon DynamoDB ISS-task-dns-track-dev table...${NC}"
        aws dynamodb create-table --cli-input-json file://json_configs/dynamodb_table.json > /dev/null
        aws dynamodb wait table-exists --table-name ISS-task-dns-track-dev

        #Populates the Amazon DynamoDB ISS-task-dns-track-dev table with the initial values
        echo -e "${GREEN}Populating the Amazon DynamoDB ISS-task-dns-track-dev table...${NC}"
        aws dynamodb batch-write-item --request-items file://json_configs/ivs_dynamodb_populate.json > /dev/null
    
    else
        
        #Populates the Amazon DynamoDB ISS-task-dns-track-dev table with the initial values
        echo -e "${GREEN}Populating the Amazon DynamoDB ISS-task-dns-track-dev table...${NC}"
        aws dynamodb batch-write-item --request-items file://json_configs/ivs_dynamodb_populate.json > /dev/null
    
    fi
}

################################################################################
# Security Groups                                                              #
################################################################################

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

################################################################################
# ECS Resources                                                                #
################################################################################

function fargate_resources () {

    # This function will create all fargate resources required by ivs-webrtc
    
    unset ivs_service
    
    #Creates the Amazon ECS Cluster named ivs
    echo -e "${GREEN}Creating the Amazon ECS Cluster named ivs...${NC}"
    aws ecs create-cluster --cluster-name ivs | jq '.cluster.clusterArn' | sed 's/"//g' > ./temp_files/ecs_cluster_arn.txt

    #Configures the ivs_task_definition.json file with the correct Amazon ECS execution previously created
    echo -e "${GREEN}Configuring the ivs_task_definition.json file with the correct Amazon ECS execution...${NC}"
    ecs_role_arn=$(cat ./temp_files/ivs_ecs_execution_role_arn.txt)
    ecr_uri=$(cat ./temp_files/ecr_uri.txt)":latest"
    jq --arg v "$ecs_role_arn" --arg f "$ecr_uri" '.taskRoleArn = $v | .executionRoleArn = $v | .containerDefinitions[0].image = $f' ./json_models/ivs_task_definition_model.json > ./json_configs/ivs_task_definition.json   
     
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
        store_sgid=$(cat ./temp_files/ivs_sg.txt)
        store_subnets=$(sed -e 'N;s/\n//;N;s/\n//;N;s/\n//' ./temp_files/my_subnets.txt | sed -e 'N;s/\n//;s/ //g;s/[][]//g;s/^"//g;s/"$//g') 
        jq --arg v "$store_subnets" '.networkConfiguration.awsvpcConfiguration |= . + {"subnets":[$v]}' \
./json_models/ecs_services_model.json | jq --arg v "$store_sgid" '.networkConfiguration.awsvpcConfiguration |= . + {"securityGroups":[$v]}' \
| sed -e 's/\\//g' > ./json_configs/ivs_ecs_service.json

        #Creates the Amazon ECS service named ivs-webrtc
        echo -e "${GREEN}Creating the Amazon ECS service named ivs-webrtc...${NC}"
        aws ecs create-service --cli-input-json file://json_configs/ivs_ecs_service.json > /dev/null
    
    else
    
        error_exit "The ivs-webrtc does exist and cannot be automatically replaced! Try to delete it mannually and re-run this script."
        
    fi
}

################################################################################
# EventBridge  Resources                                                       #
################################################################################

function eventbridge_resources () {

    # This function will create all eventbridge resources required by ivs-webrtc
    
    unset lambda
    
    # Test if exists
    aws lambda get-function --function-name ivs-ip-register > /dev/null 2>&1 && lambda='OK' || lambda='NOK'

    #Configures the ivs_events_rule.json with the correct ivs service configured in Amazon ECS Cluster
    echo -e "${GREEN}Configuring the ivs_events_rule.json with the correct ivs service configured in Amazon ECS Cluster...${NC}"
    ecs_arn=$(cat ./temp_files/ecs_cluster_arn.txt) 
    sed -e "s@ARN_HERE@${ecs_arn}\\\@g" json_models/ivs_events_rule_model.json > ./json_configs/ivs_events_rule.json

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

################################################################################
# CloudWatch Resources                                                         #
################################################################################

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

################################################################################
# Adjust Fargate Tasks                                                         #
################################################################################

function fargate_adjust_service () {

    # This function will adjust the fargate service ivs-webrtc from 0 to 2 tasks
    echo -e "${GREEN}Adjusting fargate service to 2 tasks...${NC}"
    aws ecs update-service --cluster ivs --service ivs-webrtc --desired-count 2 > /dev/null

    

}

################################################################################
# Error messages                                                               #
################################################################################

function error_exit () {
    
    echo -e "${RED}$1${NC}" 1>&2
    exit 1

}

################################################################################
# Options to deploy the backend                                                #
################################################################################

function deploy () {

	# This function will receive a argument from the command line to start the cleaning process
	# It will be possible to uninstall everything or just pontual services
	
	option=$1
	
	case $option in
	all)
        ecr_resources || { error_exit 'ecr deployment failed!'; }
        s3_resources || { error_exit 's3 deployment failed!'; }
        codebuild_adjust_templates || { error_exit 'coldbuild templates adjustment failed!'; } 
        codebuild_iam || { error_exit 'coldbuild roles and policies failed'; }  
        codebuild_resources || { error_exit 'codebuild deployment failed!'; }
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

 	ecr)
	    echo -e "${GREEN}###Deploying ecr resources###${NC}"
		ecr_resources
		;;   

 	s3)
	    echo -e "${GREEN}###Deploying s3 resources###${NC}"
		s3_resources
		;; 

 	templates)
	    echo -e "${GREEN}###Adjusting codebuild templates###${NC}"
		codebuild_adjust_templates
		;; 

 	codebuild_rp)
	    echo -e "${GREEN}###Deploying codebuild roles and policies###${NC}"
		codebuild_iam
		;; 

    codebuild)
	    echo -e "${GREEN}###Deploying codebuild resources###${NC}"
	    codebuild_resources
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