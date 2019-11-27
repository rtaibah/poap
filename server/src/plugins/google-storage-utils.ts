
import * as storage from '@google-cloud/storage';
import getEnv from '../envs';

export async function uploadFile(gcsFileName: string, mimetype:string, in_memory_file:any): Promise<string | null> {
    const env = getEnv();
    const googleStorageClient = new storage.Storage();
    const bucketName = env.googleStorageBucket;
    const bucket = googleStorageClient.bucket(bucketName);
    const file = bucket.file(gcsFileName);
  
    const blob = file.createWriteStream({
      metadata: {
        contentType: mimetype,
      },
      public: true
    });

    blob.on('error', (err: any) => {
      console.log(err);
      return null;
    });
  
    blob.on('finish', () => {
      console.log(`https://storage.googleapis.com/${bucket.name}/${gcsFileName}`);
      return true
    });

    blob.end(in_memory_file);

    return `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`

    // stream.on('readable', () => {
    //   let chunk;
    //   let in_process = false;
    //   while (null !== (chunk = stream.read())) {
    //     in_process = true;
    //     blob.write(chunk);
    //   }
    //   if(!in_process) {
        
    //   }
    // })
  }
  
  export async function listFiles() {
    const env = getEnv();
    const googleStorageClient = new storage.Storage();
  
    const [files] = await googleStorageClient.bucket(env.googleStorageBucket).getFiles();
  
    console.log('Files:');
    files.forEach(file => {
      getMetadata(env.googleStorageBucket, file.name);
    });
    // [END storage_list_files]
  }
  
  export async function getMetadata(bucketName: string, filename: string) {
    // [START storage_get_metadata]
    // Imports the Google Cloud client library
    const {Storage} = require('@google-cloud/storage');
  
    // Creates a client
    const storage = new Storage();
  
    /**
     * TODO(developer): Uncomment the following lines before running the sample.
     */
    // const bucketName = 'Name of a bucket, e.g. my-bucket';
    // const filename = 'File to access, e.g. file.txt';
  
    // Gets the metadata for the file
    const [metadata] = await storage
      .bucket(bucketName)
      .file(filename)
      .getMetadata();
  
    console.log(`File: ${metadata.name}`);
    // console.log(`Bucket: ${metadata.bucket}`);
    // console.log(`  Storage class: ${metadata.storageClass}`);
    console.log(`  Self link: ${metadata.selfLink}`);
    console.log(`  ID: ${metadata.id}`);
    console.log(`  Size: ${metadata.size}`);
    // console.log(`  Updated: ${metadata.updated}`);
    // console.log(`  Generation: ${metadata.generation}`);
    // console.log(`  Metageneration: ${metadata.metageneration}`);
    // console.log(`  Etag: ${metadata.etag}`);
    // console.log(`  Owner: ${metadata.owner}`);
    // console.log(`  Component count: ${metadata.component_count}`);
    // console.log(`  Crc32c: ${metadata.crc32c}`);
    // console.log(`  md5Hash: ${metadata.md5Hash}`);
    // console.log(`  Cache-control: ${metadata.cacheControl}`);
    // console.log(`  Content-type: ${metadata.contentType}`);
    // console.log(`  Content-disposition: ${metadata.contentDisposition}`);
    // console.log(`  Content-encoding: ${metadata.contentEncoding}`);
    // console.log(`  Content-language: ${metadata.contentLanguage}`);
    // console.log(`  Media link: ${metadata.mediaLink}`);
    // console.log(`  KMS Key Name: ${metadata.kmsKeyName}`);
    // console.log(`  Temporary Hold: ${metadata.temporaryHold}`);
    // console.log(`  Event-based hold: ${metadata.eventBasedHold}`);
    // console.log(`  Effective Expiration Time: ${metadata.effectiveExpirationTime}`);
    // console.log(`  Metadata: ${metadata.metadata}`);
    // [END storage_get_metadata]
  }
  