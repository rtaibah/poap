import { getEvents, updateEvent } from '../db';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

import { uploadFile } from './google-storage-utils';

dotenv.config();

export async function migrateEventImagesToGoogle(){
  const events = await getEvents();
  const eventsWithImages = events.filter(event => event.hasOwnProperty('image_url') && event.image_url !== '');
  console.log(eventsWithImages);

  for await (let event of eventsWithImages) {
    console.log(event);
    const {
      id,
      fancy_id: fancyId,
      event_url: eventUrl,
      image_url: imageUrl,
      event_host_id: eventHostId,
    } = event;

    console.log(imageUrl);
    const response = await fetch(imageUrl);
    const file = await response.buffer();

    const filename = fancyId + '-' + id + '-logo.png'
    const googleImageUrl = await uploadFile(filename, 'image/png', file);

    if (googleImageUrl) {
      console.log('--->' + googleImageUrl);
      await updateEvent(fancyId, eventHostId, { event_url: eventUrl, image_url: googleImageUrl });
    }
  }

}

migrateEventImagesToGoogle();
