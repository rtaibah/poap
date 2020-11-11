import AWS from 'aws-sdk';

import getEnv from '../envs';
import { formatDate } from '../db';
import { FullEventTemplate, PoapFullEvent } from '../types';


function sendEmail(recipients: string[], templateName: string, templateData: any): Promise<boolean>{
  const env = getEnv();


  const destinations = recipients.map(recipient => {
    return {
      Destination: {
        ToAddresses: [recipient]
      },
    }
  })
  // Create sendTemplatedEmail params
  const params = {
    Destinations: destinations,
    Source: env.senderEmail,
    Template: templateName,
    DefaultTemplateData: JSON.stringify(templateData),
  };

  // Load the AWS SDK for Node.js
  AWS.config.update({region: env.awsRegion, accessKeyId: env.awsAccessKey, secretAccessKey: env.awsSecretAccessKey});
  // Create the promise and SES service object
  return new AWS.SES().sendBulkTemplatedEmail(params).promise()
    .then((m) => true)
    .catch((e) => false);
}


export async function sendNewEventEmail(event: PoapFullEvent, recipients: string[]): Promise<boolean> {

  const env = getEnv();
  const emailData = {
      name: event.name,
      description: event.description,
      start_date: formatDate(event.start_date),
      website: event.event_url,
      img_url: event.image_url,
      fancy_id: event.fancy_id,
      secret_code: event.secret_code,
  }

  return sendEmail(recipients, env.newEventEmailTemplate, emailData);
}

export async function sendNewEventTemplateEmail(eventTemplate: FullEventTemplate, recipients: string[]): Promise<boolean> {
  const env = getEnv();

  const emailData = {
      template_id: eventTemplate.id,
      name: eventTemplate.name,
      image_url: eventTemplate.title_image,
      secret_code: eventTemplate.secret_code
    }
  return sendEmail(recipients, env.newEventTemplateEmailTemplate, emailData);
}


export async function sendRedeemTokensEmail(token: string, recipient: string): Promise<boolean> {
  const env = getEnv();

  const emailData = {
      token: token,
  }
  return sendEmail([recipient], env.redeemTokensEmailTemplate, emailData);

}
