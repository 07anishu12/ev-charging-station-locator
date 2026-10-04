/**
 * FastCharger S3-Compatible Object Storage Abstraction
 *
 * Supported implementations:
 * - AWS S3
 * - Cloudflare R2
 * - MinIO
 * - Memory (isolated test driver)
 *
 * RULES:
 * - Buckets are private by default.
 * - Credentials must NEVER be exposed to the frontend.
 * - External user access is strictly mediated via time-limited signed URLs.
 * - PostgreSQL stores metadata; large raw payloads live in Object Storage.
 */

export type StorageProviderType = "s3" | "r2" | "minio" | "memory";

export interface StorageConfig {
  provider?: StorageProviderType;
  endpoint?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  defaultBucket?: string;
  forcePathStyle?: boolean;
}

export interface PutObjectInput {
  key: string;
  bucket?: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}

export interface PutObjectOutput {
  key: string;
  bucket: string;
  sizeBytes: number;
  checksumSha256: string;
  etag?: string;
  versionId?: string;
}

export interface GetObjectInput {
  key: string;
  bucket?: string;
}

export interface GetObjectOutput {
  key: string;
  bucket: string;
  body: Buffer;
  contentType: string;
  contentLength: number;
  checksumSha256: string;
  lastModified: Date;
  metadata: Record<string, string>;
  etag?: string;
}

export interface HeadObjectInput {
  key: string;
  bucket?: string;
}

export interface HeadObjectOutput {
  key: string;
  bucket: string;
  exists: boolean;
  contentType?: string;
  contentLength?: number;
  checksumSha256?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
  etag?: string;
}

export interface DeleteObjectInput {
  key: string;
  bucket?: string;
}

export interface DeleteObjectOutput {
  key: string;
  bucket: string;
  deleted: boolean;
}

export interface CreateSignedUrlInput {
  key: string;
  bucket?: string;
  operation: "getObject" | "putObject";
  expiresInSeconds?: number;
}

export interface ObjectStorageClient {
  readonly providerType: StorageProviderType;
  readonly defaultBucket: string;

  putObject(input: PutObjectInput): Promise<PutObjectOutput>;
  getObject(input: GetObjectInput): Promise<GetObjectOutput>;
  headObject(input: HeadObjectInput): Promise<HeadObjectOutput>;
  deleteObject(input: DeleteObjectInput): Promise<DeleteObjectOutput>;
  createSignedUrl(input: CreateSignedUrlInput): Promise<string>;
}
