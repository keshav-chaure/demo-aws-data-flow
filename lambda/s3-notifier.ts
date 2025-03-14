import { S3Handler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as csvParserModule from 'csv-parser';
const csvParser = csvParserModule.default;

const s3 = new AWS.S3();
const ses = new AWS.SES();

const REQUIRED_HEADERS = ['CustomerID','Email', 'FirstName', 'LastName'];

export const handler: S3Handler = async (event) => {
  const bucketName = event.Records[0].s3.bucket.name;
  const objectKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  console.log("bucketName : ",bucketName);
  console.log("ObjectKey : ",objectKey);

  try {
    // Fetch the object from S3
    const params = {
      Bucket: bucketName,
      Key: objectKey,
    };
     
    const data = await s3.getObject(params).promise();
    console.log(typeof data)
    console.log(data)

    const s3Stream = await s3.getObject(params).createReadStream();
    const results: any[] = [];
    // await new Promise<void>((resolve, reject) => {
    //     s3Stream
    //       .pipe(csvParser())
    //       .on('data', (data) => results.push(data))
    //       .on('end', () => {
    //         console.log('CSV parsing completed:', results);
    //         resolve();
    //       })
    //       .on('error', (error) => {
    //         console.error('Error parsing CSV:', error);
    //         reject(error);
    //       });
    //   });
    await new Promise<void>((resolve, reject) => {
        let headersValidated = false;
  
        s3Stream
          .pipe(csvParser())
          .on('headers', (headers) => {
            const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
            if (missingHeaders.length > 0) {
              reject(new Error(`Missing required headers: ${missingHeaders.join(', ')}`));
            } else {
              headersValidated = true;
            }
          })
          .on('data', (data) => {
            if (headersValidated) {
              const missingDataFields = REQUIRED_HEADERS.filter(field => !data[field]);
              if (missingDataFields.length > 0) {
                console.warn(`Row with missing data fields: ${missingDataFields.join(', ')}`);
              } else {
                results.push(data);
              }
            }
          })
          .on('end', () => {
            console.log('CSV parsing completed:', results);
            resolve();
          })
          .on('error', (error) => {
            console.error('Error parsing CSV:', error);
            reject(error);
          });
      });

    console.log('CSV file is valid.');
  } catch (error) {
    console.error('Error processing S3 file:', error);
   // await sendNotification('Error processing S3 file.');
  }
};

const sendNotification = async (message: string) => {
  const params = {
    Source: 'keshav.chaure@gmail.com',
    Destination: {
      ToAddresses: ['keshav.chaure@gmail.com'],
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