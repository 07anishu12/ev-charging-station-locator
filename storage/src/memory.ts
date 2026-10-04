import crypto from "node:crypto";
import {
  InvalidStorageInputError,
  ObjectNotFoundError,
  StoragePermissionError,
} from "./errors";
import {
  CreateSignedUrlInput,
  DeleteObjectInput,
  DeleteObjectOutput,
  GetObjectInput,
  GetObjectOutput,
  HeadObjectInput,
  HeadObjectOutput,
  ObjectStorageClient,
  PutObjectInput,
  PutObjectOutput,
  StorageProviderType,
} from "./types";

interface StoredMemoryObject {
  body: Buffer;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  metadata: Record<string, string>;
  lastModified: Date;
  etag: string;
}

export class MemoryObjectStorageClient implements ObjectStorageClient {
  public readonly providerType: StorageProviderType = "memory";
  public readonly defaultBucket: string;
  private readonly buckets: Map<string, Map<string, StoredMemoryObject>> = new Map();
  private simulatePermissionDenied: boolean = false;

  constructor(defaultBucket: string = "fastcharger-raw") {
    this.defaultBucket = defaultBucket;
    this.buckets.set(defaultBucket, new Map());
  }

  public setSimulatePermissionDenied(deny: boolean): void {
    this.simulatePermissionDenied = deny;
  }

  private resolveBucket(bucketName?: string): string {
    return bucketName?.trim() || this.defaultBucket;
  }

  private validateKey(key?: string): string {
    if (!key || typeof key !== "string" || key.trim().length === 0) {
      throw new InvalidStorageInputError("Object key must be a non-empty string.", key);
    }
    return key.trim();
  }

  private checkPermission(bucket: string, key?: string): void {
    if (this.simulatePermissionDenied) {
      throw new StoragePermissionError(bucket, key);
    }
  }

  public async putObject(input: PutObjectInput): Promise<PutObjectOutput> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);
    this.checkPermission(bucket, key);

    const buffer = Buffer.isBuffer(input.body)
      ? input.body
      : typeof input.body === "string"
        ? Buffer.from(input.body, "utf-8")
        : Buffer.from(input.body);

    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const etag = `"${checksumSha256.slice(0, 16)}"`;
    const contentType = input.contentType || "application/octet-stream";

    let bucketStore = this.buckets.get(bucket);
    if (!bucketStore) {
      bucketStore = new Map();
      this.buckets.set(bucket, bucketStore);
    }

    bucketStore.set(key, {
      body: buffer,
      contentType,
      sizeBytes: buffer.length,
      checksumSha256,
      metadata: { ...(input.metadata || {}) },
      lastModified: new Date(),
      etag,
    });

    return {
      key,
      bucket,
      sizeBytes: buffer.length,
      checksumSha256,
      etag,
    };
  }

  public async getObject(input: GetObjectInput): Promise<GetObjectOutput> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);
    this.checkPermission(bucket, key);

    const bucketStore = this.buckets.get(bucket);
    const obj = bucketStore?.get(key);

    if (!obj) {
      throw new ObjectNotFoundError(bucket, key);
    }

    return {
      key,
      bucket,
      body: Buffer.from(obj.body),
      contentType: obj.contentType,
      contentLength: obj.sizeBytes,
      checksumSha256: obj.checksumSha256,
      lastModified: obj.lastModified,
      metadata: { ...obj.metadata },
      etag: obj.etag,
    };
  }

  public async headObject(input: HeadObjectInput): Promise<HeadObjectOutput> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);
    this.checkPermission(bucket, key);

    const bucketStore = this.buckets.get(bucket);
    const obj = bucketStore?.get(key);

    if (!obj) {
      return {
        key,
        bucket,
        exists: false,
      };
    }

    return {
      key,
      bucket,
      exists: true,
      contentType: obj.contentType,
      contentLength: obj.sizeBytes,
      checksumSha256: obj.checksumSha256,
      lastModified: obj.lastModified,
      metadata: { ...obj.metadata },
      etag: obj.etag,
    };
  }

  public async deleteObject(input: DeleteObjectInput): Promise<DeleteObjectOutput> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);
    this.checkPermission(bucket, key);

    const bucketStore = this.buckets.get(bucket);
    const deleted = bucketStore ? bucketStore.delete(key) : false;

    return {
      key,
      bucket,
      deleted,
    };
  }

  public async createSignedUrl(input: CreateSignedUrlInput): Promise<string> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);
    this.checkPermission(bucket, key);

    const expiresInSeconds = input.expiresInSeconds || 900;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = crypto
      .createHmac("sha256", "mock-storage-secret")
      .update(`${input.operation}:${bucket}:${key}:${expiresAt}`)
      .digest("hex");

    return `https://storage.fastcharger.local/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}?operation=${input.operation}&expires=${expiresAt}&signature=${signature}`;
  }
}
