import { S3Event } from "aws-lambda";
import * as AWS from "aws-sdk"; 

const sns = new AWS.SNS();

const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN!;

export const handler = async (event: S3Event): Promise<void> => {
    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = record.s3.object.key;
        const fileSize = record.s3.object.size;

        console.log(`New file uploaded: ${key} in bucket: ${bucket}`);

        // ✅ Send SNS Notification
        const message = `A new file has been uploaded.\n\nFile: ${key}\nBucket: ${bucket}\nSize: ${fileSize} bytes`;
        await sns.publish({
            TopicArn: SNS_TOPIC_ARN,
            Message: message,
            Subject: "New File Uploaded to S3",
        }).promise();

        console.log("Notification sent successfully!");
    }
};
