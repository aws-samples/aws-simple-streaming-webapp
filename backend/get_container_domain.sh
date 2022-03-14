#!/bin/bash
# This script get the domain from the dynamo table and set as a env var for the CloudFront Distribution Creation

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Var Definitons

DyTable='ISS-task-dns-track-dev'
AwsAccProfile='poc-account'
Region='us-east-1'

# Scan the Dynamo Table
aws dynamodb scan --table-name $DyTable --filter-expression "replaced = :n" --expression-attribute-values {\":n\":{\"S\":\"no\"}} --max-items 1 --profile $AwsAccProfile --region $Region > ./temp_files/dynamo_scan.txt


# Saves RTMPS EndPoint
DomainResults=$(cat ./temp_files/dynamo_scan.txt| jq '.Items[].dns.S')

echo -e "\nCopy Domain: ${GREEN}${DomainResults}${NC}\n" 
export DOMAIN=${DomainResults}