import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
 
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';



import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as fs from 'fs';
import path = require('path');
// import * as sqs from 'aws-cdk-lib/aws-sqs';

// Read the config.json file
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

export class DataPipelineDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

     // Determine the environment from CDK context
     const env = this.node.tryGetContext('env') || 'dev';  // Default to 'dev'


    // Get bucket name & region from config
    const bucketName = config[env].bucketName;
    const region = config[env].region;
    const email = config[env].email;

    // Create an S3 bucket
      // Create S3 Bucket
      const bucket = new s3.Bucket(this, 'MyBucket1', {
      bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false
    });


        //// Output the bucket name
    new cdk.CfnOutput(this, 'BucketNameOutput', { value: bucketName });



      // // Create SNS Topic
      const topic = new sns.Topic(this, 'S3UploadTopic');

      //  // Subscribe an email to the SNS topic
       topic.addSubscription(new snsSubscriptions.EmailSubscription(email));

      // // Add S3 Event Notification to SNS
     // bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3Notifications.SnsDestination(topic));

  // Define a custom IAM role
  const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  });

  // Attach managed policy to the role
  lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

  // Add custom inline policy
  lambdaRole.addToPolicy(new iam.PolicyStatement({
    actions: ['s3:GetObject'],
    resources: ['arn:aws:s3:::data-pipeline-bucket-dev-one/*'],
  }));



      // ✅ Create Lambda Function
      const s3Lambda = new NodejsFunction(this, 'S3UploadNotificationLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'handler',
        entry: path.join(__dirname, '../lambda/s3-notifier.ts'),// 'lambda/s3-notifier.ts', // Path to Lambda TypeScript file  Error: Cannot find entry file at lambda/s3-notifier.ts
        environment: {
            BUCKET_NAME: bucket.bucketName,
            SNS_TOPIC_ARN: topic.topicArn
        },
        role: lambdaRole
    });

    s3Lambda.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSESFullAccess')
    );

    // Define a custom inline policy statement
    const sesPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    });

    // Attach the custom inline policy to the Lambda's execution role
    s3Lambda.addToRolePolicy(sesPolicyStatement);

     // Grant Lambda Access to Publish to SNS
     topic.grantPublish(s3Lambda);

     //  Add S3 Event Notification to Trigger Lambda
     bucket.addEventNotification(
         s3.EventType.OBJECT_CREATED,
         new s3Notifications.LambdaDestination(s3Lambda)
     );


      // Output SNS Topic ARN
      new cdk.CfnOutput(this, 'SNSTopicARN', {
          value: topic.topicArn,
      });
    // example resource
    // const queue = new sqs.Queue(this, 'DataPipelineDemoQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
