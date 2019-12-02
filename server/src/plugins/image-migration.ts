import { getEvents, updateEvent } from '../db';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

import { uploadFile } from './google-storage-utils';

dotenv.config();

export async function migrateEventImagesToGoogle(){
  const events = await getEvents();
  for await (let event of events) {
    if(event.image_url){
      console.log(event.image_url)
      const response = await fetch(event.image_url)
      const file = await response.buffer();

      const filename = event.fancy_id + '-' + event.id + '-logo.png'
      const google_image_url = await uploadFile(filename, 'image/png', file);
      if (google_image_url) {
        console.log('--->' + google_image_url);
        await updateEvent(event.fancy_id, event.event_host_id, {
          event_url: event.event_url,
          image_url: google_image_url
        });
      }
    }
  }

}

migrateEventImagesToGoogle();
