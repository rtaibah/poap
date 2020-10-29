import sgMail from '@sendgrid/mail';

import getEnv from '../envs';
import { formatDate } from '../db';
import { FullEventTemplate, PoapFullEvent } from '../types';


export async function sendNewEventEmail(event: PoapFullEvent, recipients: string[]): Promise<boolean> {
    const env = getEnv();

    const sendgridApiKey = env.sendgridApiKey;
    const sendgridNewEventTemplate = env.sendgridNewEventTemplate;
    const sendgridSenderEmail = env.sendgridSenderEmail;

    // using Twilio SendGrid's v3 Node.js Library
    // https://github.com/sendgrid/sendgrid-nodejs
    sgMail.setApiKey(sendgridApiKey);

    const email = {
        to: recipients,
        from: sendgridSenderEmail,
        subject: 'New POAP event created',
        templateId: sendgridNewEventTemplate,
        dynamic_template_data: {
            name: event.name,
            description: event.description,
            start_date: formatDate(event.start_date),
            website: event.event_url,
            img_url: event.image_url,
            fancy_id: event.fancy_id,
            secret_code: event.secret_code,
        }
    };

    sgMail.sendMultiple(email).then(m => {
        return true
    }).catch(error => {
        // Log friendly error
        // console.error(error.toString());
        return false
    });
    return false
}

export async function sendNewEventTemplateEmail(eventTemplate: FullEventTemplate, recipients: string[]): Promise<boolean> {
  const env = getEnv();

  const sendgridApiKey = env.sendgridApiKey;
  const sendgridNewEventTemplateTemplate = env.sendgridNewEventTemplateTemplate;
  const sendgridSenderEmail = env.sendgridSenderEmail;

  // using Twilio SendGrid's v3 Node.js Library
  // https://github.com/sendgrid/sendgrid-nodejs
  sgMail.setApiKey(sendgridApiKey);

  const email = {
    to: recipients,
    from: sendgridSenderEmail,
    subject: 'New POAP event template created',
    templateId: sendgridNewEventTemplateTemplate,
    dynamic_template_data: {
      id: eventTemplate.id,
      name: eventTemplate.name,
      image_url: eventTemplate.title_image,
      secret_code: eventTemplate.secret_code,
    }
  };

  sgMail.sendMultiple(email).then(m => {
    return true
  }).catch(error => {
    // Log friendly error
    // console.error(error.toString());
    return false
  });
  return false
}


export async function sendRedeemTokensEmail(recipient: string, token: string): Promise<boolean> {
  const env = getEnv();

  const sendgridApiKey = env.sendgridApiKey;
  const sendgridRedeemTokensTemplate = env.sendgridRedeemTokensTemplate;
  const sendgridSenderEmail = env.sendgridSenderEmail;

  // using Twilio SendGrid's v3 Node.js Library
  // https://github.com/sendgrid/sendgrid-nodejs
  sgMail.setApiKey(sendgridApiKey);

  const email = {
    to: recipient,
    from: sendgridSenderEmail,
    subject: 'Claim your POAPs!',
    templateId: sendgridRedeemTokensTemplate,
    dynamic_template_data: {
      token: token
    }
  };

  try {
    await sgMail.send(email);
    return true
  } catch (e){
    console.log(e.toString());
  }
  return false
}
