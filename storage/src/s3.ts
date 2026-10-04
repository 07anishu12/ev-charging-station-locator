import crypto from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  InvalidStorageInputError,
  ObjectNotFoundError,
  StorageConnectionError,
  StorageOperationError,
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
  StorageConfig,
  StorageProviderType,
} from "./types";

export class S3CompatibleObjectStorageClient implements ObjectStorageClient {
  public readonly providerType: StorageProviderType;
  public readonly defaultBucket: string;
  private readonly s3Client: S3Client;

  constructor(config: StorageConfig = {}) {
    this.providerType = config.provider || "s3";
    this.defaultBucket =
      config.defaultBucket || process.env.STORAGE_DEFAULT_BUCKET || "fastcharger-raw";

    const region = config.region || process.env.AWS_REGION || "ap-south-1";
    const endpoint = config.endpoint || process.env.STORAGE_ENDPOINT;
    const forcePathStyle =
      config.forcePathStyle ??
      (this.providerType === "minio" || process.env.STORAGE_FORCE_PATH_STYLE === "true");

    const accessKeyId =
      config.accessKeyId ||
      process.env.STORAGE_ACCESS_KEY ||
      process.env.AWS_ACCESS_KEY_ID ||
      "";
    const secretAccessKey =
      config.secretAccessKey ||
      process.env.STORAGE_SECRET_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      "";

    this.s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });
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

  private handleError(err: unknown, bucket: string, key?: string): never {
    if (err instanceof StorageOperationError) {
      throw err;
    }

    if (err instanceof S3ServiceException) {
      const statusCode = err.$metadata?.httpStatusCode;
      const errorName = err.name;

      if (statusCode === 404 || errorName === "NoSuchKey" || errorName === "NotFound") {
        throw new ObjectNotFoundError(bucket, key || "unknown", err.message);
      }

      if (statusCode === 403 || errorName === "AccessDenied") {
        throw new StoragePermissionError(bucket, key, err.message);
      }

      throw new StorageOperationError(
        `S3 storage operation failed: ${err.message}`,
        errorName,
        bucket,
        key,
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
      throw new StorageConnectionError(
        `Failed connecting to object storage endpoint: ${message}`,
        bucket,
      );
    }

    throw new StorageOperationError(`Storage operation error: ${message}`, "UNKNOWN", bucket, key);
  }

  public async putObject(input: PutObjectInput): Promise<PutObjectOutput> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);

    const buffer = Buffer.isBuffer(input.body)
      ? input.body
      : typeof input.body === "string"
        ? Buffer.from(input.body, "utf-8")
        : Buffer.from(input.body);

    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: input.contentType || "application/octet-stream",
        ContentLength: buffer.length,
        Metadata: input.metadata,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        bucket,
        sizeBytes: buffer.length,
        checksumSha256,
        etag: response.ETag,
        versionId: response.VersionId,
      };
    } catch (err) {
      this.handleError(err, bucket, key);
    }
  }

  public async getObject(input: GetObjectInput): Promise<GetObjectOutput> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new ObjectNotFoundError(bucket, key, "Response body was empty.");
      }

      const bytes = await response.Body.transformToByteArray();
      const body = Buffer.from(bytes);
      const checksumSha256 = crypto.createHash("sha256").update(body).digest("hex");

      return {
        key,
        bucket,
        body,
        contentType: response.ContentType || "application/octet-stream",
        contentLength: response.ContentLength ?? body.length,
        checksumSha256,
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata || {},
        etag: response.ETag,
      };
    } catch (err) {
      this.handleError(err, bucket, key);
    }
  }

  public async headObject(input: HeadObjectInput): Promise<HeadObjectOutput> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        bucket,
        exists: true,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata || {},
        etag: response.ETag,
      };
    } catch (err) {
      if (err instanceof S3ServiceException && (err.$metadata?.httpStatusCode === 404 || err.name === "NotFound")) {
        return {
          key,
          bucket,
          exists: false,
        };
      }
      this.handleError(err, bucket, key);
    }
  }

  public async deleteObject(input: DeleteObjectInput): Promise<DeleteObjectOutput> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      return {
        key,
        bucket,
        deleted: true,
      };
    } catch (err) {
      this.handleError(err, bucket, key);
    }
  }

  public async createSignedUrl(input: CreateSignedUrlInput): Promise<string> {
    const bucket = this.resolveBucket(input.bucket);
    const key = this.validateKey(input.key);
    const expiresIn = input.expiresInSeconds || 900;

    try {
      const command =
        input.operation === "putObject"
          ? new PutObjectCommand({ Bucket: bucket, Key: key })
          : new GetObjectCommand({ Bucket: bucket, Key: key });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (err) {
      this.handleError(err, bucket, key);
    }
  }
}
