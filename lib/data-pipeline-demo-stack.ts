import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import * as fs from 'fs';
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
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });


        //// Output the bucket name
    new cdk.CfnOutput(this, 'BucketNameOutput', { value: bucketName });



      // Create SNS Topic
      const topic = new sns.Topic(this, 'S3UploadTopic');

       // Subscribe an email to the SNS topic
       topic.addSubscription(new snsSubscriptions.EmailSubscription(email));

      // Add S3 Event Notification to SNS
      bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3Notifications.SnsDestination(topic));

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
