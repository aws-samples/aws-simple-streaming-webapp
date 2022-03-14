import * as cdk from "@aws-cdk/core";
import * as AmplifyHelpers from "@aws-amplify/cli-extensibility-helper";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as origins from "@aws-cdk/aws-cloudfront-origins";
import * as cr from "@aws-cdk/custom-resources";
import { AmplifyDependentResourcesAttributes } from "../../types/amplify-dependent-resources-ref";
//import * as iam from '@aws-cdk/aws-iam';
//import * as sns from '@aws-cdk/aws-sns';
//import * as subs from '@aws-cdk/aws-sns-subscriptions';
//import * as sqs from '@aws-cdk/aws-sqs';

export class cdkStack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    props?: cdk.StackProps,
    amplifyResourceProps?: AmplifyHelpers.AmplifyResourceProps
  ) {
    super(scope, id, props);
    /* Do not remove - Amplify CLI automatically injects the current deployment environment in this input parameter */
    new cdk.CfnParameter(this, "env", {
      type: "String",
      description: "Current Amplify CLI env name",
    });
    /* AWS CDK code goes here - learn more: https://docs.aws.amazon.com/cdk/latest/guide/home.html */

    /* Check Server IPS */

    const awsCustom = new cr.AwsCustomResource(this, "aws-custom", {
      onCreate: {
        service: "dynamodb",
        action: "...",
        parameters: {
          text: "...",
        },
        physicalResourceId: cr.PhysicalResourceId.of("..."),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    /* Cloud frontDistribution*/
    new cloudfront.Distribution(this, "Dist4Container", {
      comment: "create by simple streaming",
      defaultBehavior: {
        origin: new origins.HttpOrigin(process.env.DOMAIN),
      },
    });
  }
}
