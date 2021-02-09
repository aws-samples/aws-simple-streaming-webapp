# Simple webRTC to RTMP for Amazon Interactive Video Streaming

Reference code and solution to simplify the live streaming by using the browser APIs and webRTC to capture the video.
The solution is based on small, idependent and decoupled blocks to capture cameras and transwrap it to RTMP 

![Application Frontend] (doc/front.png)

## Solution Architecture

## Deployment Steps

### Pre-requeriments

For deploying the transwrap container, we will need to install AWS Cli (Install AWS Cli (https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html))

For building the integration with AWS components and host our web application we will be using AWS Amplify. 
For more complete steps of installing and configure AWS Amplify please visit the documentation (Amplify Documentation (https://docs.amplify.aws/start/getting-started/installation/q/integration/react#option-2-follow-the-instructions) for React). 

```
  npm install -g @aws-amplify/cli
  amplify configure
  amplify init
```

### A- Backend: Transwraping container ECS 


### B- Frontend and APIS: webRTC video capture 

#### 1. Project Dependencies

For building the integration with AWS components and host our web application we will be using AWS Amplify. 
For more complete steps of installing and configure AWS Amplify please visit the documentation (Amplify Documentation (https://docs.amplify.aws/start/getting-started/installation/q/integration/react#option-2-follow-the-instructions) for React). 

```
  npm install -g @aws-amplify/cli
  amplify configure
```

#### 2. Clone the repository solution

```
  git clone https://github.com/osmarbento-AWS/simple-streaming-webapp.git
  cd simple-streaming-webpp/frontend/
  npm install
  amplify init --app https://github.com/osmarbento-AWS/simple-streaming-webapp.git
  amplify init
  amplify push
```

{{% notice note %}}
This Command will deploy the following resources in your account:
- API Gateway: Save and retrive IVS Parameters and ECS Container availability information
- DynamoDB: Store IVS and Container servers parameters
- Lambda Funtions: For checking stored parmeters and check Event Bridge information 
{{% /notice %}}

#### 3. Run the solution in your local envirolment

```
  npm start
```

#### 4. Application Configuration
In your local envirolment http://127.0.0.1:3000 the following application will be loaded

![IVS Parameters] (doc/IVSParam.png)

Go to [Amazon Interactive Video Service Console](https://console.aws.amazon.com/ivs/) and copy the parameters to add in the Simple Streaming Solution.

![Copy Parameters] (doc/IVSCopy.png)

Add into the Simple Streaming Solution and Save!


If you don't have a channel created on IVS yet, you can follow the 3 simple steps bellow

#### 4.1. (Optional): Creating a Channel on Amazon Iteractive Video Service

a. Go to [Amazon Interactive Video Service Console](https://console.aws.amazon.com/ivs/)

b. Create your IVS Channel
In simple two steps:

![IVS Parameters] (doc/IVSCreateChannel_1.png)
![IVS Parameters] (doc/IVSCreateChannel_2.png)

Finally copy the IVS parameters and add to the interface.
![Copy Parameters] (doc/IVSCopy.png)

#### 5. Test your live streaming from your browser

Select your prefered camera and audio input and click on Go Live!

![You Are Live] (doc/ISSSLive.png)

## References and useful links

Code based on https://github.com/fbsamples/Canvas-Streaming-Example

