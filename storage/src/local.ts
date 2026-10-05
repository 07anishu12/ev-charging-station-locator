import { createHash } from 'node:crypto';
import { mkdir,readFile,writeFile,stat,unlink } from 'node:fs/promises';
import path from 'node:path';
import type { ObjectStorageClient,PutObjectInput,GetObjectInput,HeadObjectInput,DeleteObjectInput } from './types';
// Durable local staging uses the existing storage interface. Signed sharing is intentionally unsupported.
export class LocalObjectStorageClient implements ObjectStorageClient {
  readonly providerType='local' as const;
  readonly defaultBucket='local-staging';
  constructor(private readonly root=path.resolve(process.env.INGESTION_STAGING_DIR||'.ingestion/raw')) {}
  private file(key:string) {const target=path.resolve(this.root,key);if(!target.startsWith(this.root+path.sep))throw new Error('Invalid archive key');return target;}
  async putObject(input:PutObjectInput) {
    const file=this.file(input.key);await mkdir(path.dirname(file),{recursive:true});
    const body=Buffer.from(input.body);await writeFile(file,body,{mode:0o600});
    await writeFile(file+'.metadata.json',JSON.stringify({contentType:input.contentType,metadata:input.metadata}),{mode:0o600});
    return {key:input.key,bucket:this.defaultBucket,sizeBytes:body.length,checksumSha256:createHash('sha256').update(body).digest('hex')};
  }
  async getObject(input:GetObjectInput) {
    const file=this.file(input.key);const body=await readFile(file);const info=await stat(file);
    const meta=JSON.parse(await readFile(file+'.metadata.json','utf8'));
    return {key:input.key,bucket:this.defaultBucket,body,contentType:meta.contentType||'application/octet-stream',contentLength:body.length,
      checksumSha256:createHash('sha256').update(body).digest('hex'),lastModified:info.mtime,metadata:meta.metadata||{}};
  }
  async headObject(input:HeadObjectInput) {try{const data=await this.getObject(input);return {...data,exists:true};}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {key:input.key,bucket:this.defaultBucket,exists:false};throw error;}}
  async deleteObject(input:DeleteObjectInput) {await unlink(this.file(input.key));await unlink(this.file(input.key)+'.metadata.json');return {key:input.key,bucket:this.defaultBucket,deleted:true};}
  async createSignedUrl():Promise<string>{throw new Error('Local staging does not issue public signed URLs');}
}
