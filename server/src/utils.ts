import getEnv from './envs';
import * as storage from '@google-cloud/storage';

export async function concurrentMap<A, B>(
  xs: A[],
  fn: (v: A) => Promise<B>,
  options: { workers: number }
) {
  let results: B[] = [];

  const rounds = Math.ceil(xs.length / options.workers);
  for (let r = 0; r < rounds; r++) {
    const promises: Promise<B>[] = [];
    const baseIdx = r * options.workers;
    for (let j = 0; j < options.workers && baseIdx + j < xs.length; j++) {
      promises.push(fn(xs[baseIdx + j]));
    }
    results = results.concat(await Promise.all(promises));
  }
  return results;
}

export async function uploadFile(filename: string) {
  const env = getEnv();
  const googleStorageClient = new storage.Storage();

  // Uploads a local file to the bucket
  await googleStorageClient.bucket(env.googleStorageBucket).upload(filename, {
    // Support for HTTP requests made with `Accept-Encoding: gzip`
    gzip: true,
    // By setting the option `destination`, you can change the name of the
    // object you are uploading to a bucket.
    metadata: {
      // Enable long-lived HTTP caching headers
      // Use only if the contents of the file will never change
      // (If the contents will change, use cacheControl: 'no-cache')
      cacheControl: 'public, max-age=31536000',
    },
  });
}

export async function listFiles() {
  const env = getEnv();
  const googleStorageClient = new storage.Storage();

  const [files] = await googleStorageClient.bucket(env.googleStorageBucket).getFiles();

  console.log('Files:');
  files.forEach(file => {
    console.log(file.name);
  });
  // [END storage_list_files]
}
