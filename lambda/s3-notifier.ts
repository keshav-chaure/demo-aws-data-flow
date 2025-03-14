import { S3Handler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as csvParser from 'csv-parser';

const s3 = new AWS.S3();
const ses = new AWS.SES();

const REQUIRED_HEADERS = ['email', 'first_name', 'last_name'];

export const handler: S3Handler = async (event) => {
  const bucketName = event.Records[0].s3.bucket.name;
  const objectKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  try {
    // Fetch the object from S3
    const params = {
      Bucket: bucketName,
      Key: objectKey,
    };
    const data = await s3.getObject(params).promise();

    // Parse the CSV data
    const records: any[] = [];
    const stream = data.Body?.toString('utf-8')?.pipe(csvParser());

    if (stream) {
      for await (const record of stream) {
        records.push(record);
      }
    }

    // Validate headers
    const headers = Object.keys(records[0]);
    const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));

    if (missingHeaders.length > 0) {
      await sendNotification(`Missing headers: ${missingHeaders.join(', ')}`);
      return;
    }

    // Validate data presence
    const invalidRows = records.filter(record =>
      REQUIRED_HEADERS.some(header => !record[header])
    );

    if (invalidRows.length > 0) {
      await sendNotification(`Found ${invalidRows.length} rows with missing data.`);
      return;
    }

    console.log('CSV file is valid.');
  } catch (error) {
    console.error('Error processing S3 file:', error);
    await sendNotification('Error processing S3 file.');
  }
};

const sendNotification = async (message: string) => {
  const params = {
    Source: 'sender@example.com',
    Destination: {
      ToAddresses: ['recipient@example.com'],
    },
    Message: {
      Subject: {
        Data: 'CSV Validation Notification',
      },
      Body: {
        Text: {
          Data: message,
        },
      },
    },
  };

  try {
    await ses.sendEmail(params).promise();
    console.log('Notification sent:', message);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};



/*
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
*/