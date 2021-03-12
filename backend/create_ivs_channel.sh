#!/bin/bash

# This script creates the IVS Channel and prints the EndPoint + StreamKey to the user 

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Creates the IVS channel
aws ivs create-channel --name $1 > ./temp_files/ivs_channel_info.txt

# Saves RTMPS EndPoint
channelEndpoint=$(cat ./temp_files/ivs_channel_info.txt | jq '.channel.ingestEndpoint' | sed -e 's/"//g;s/^/rtmps:\/\//;s/$/:443\/app\//')

# Saves StreamKey
streamKey=$(cat ./temp_files/ivs_channel_info.txt | jq '.streamKey.value' | sed -e 's/"//g')

echo -e "\nCopy EndPoint: ${GREEN}${channelEndpoint}${NC}\n" 
echo -e "Copy StreamKey: ${GREEN}${streamKey}${NC}\n" 

