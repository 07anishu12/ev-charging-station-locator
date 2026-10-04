/**
 * FastCharger Object Storage Errors
 *
 * Wraps low-level S3/R2/MinIO exceptions into domain-specific error representations.
 */

export class StorageOperationError extends Error {
  public readonly code: string;
  public readonly bucket?: string;
  public readonly key?: string;

  constructor(message: string, code: string = "STORAGE_ERROR", bucket?: string, key?: string) {
    super(message);
    this.name = "StorageOperationError";
    this.code = code;
    this.bucket = bucket;
    this.key = key;
  }
}

export class ObjectNotFoundError extends StorageOperationError {
  constructor(bucket: string, key: string, message?: string) {
    super(
      message || `Object '${key}' was not found in bucket '${bucket}'.`,
      "OBJECT_NOT_FOUND",
      bucket,
      key,
    );
    this.name = "ObjectNotFoundError";
  }
}

export class StoragePermissionError extends StorageOperationError {
  constructor(bucket: string, key?: string, message?: string) {
    super(
      message || `Access denied for storage operation on bucket '${bucket}'${key ? `, key '${key}'` : ""}.`,
      "STORAGE_ACCESS_DENIED",
      bucket,
      key,
    );
    this.name = "StoragePermissionError";
  }
}

export class StorageConnectionError extends StorageOperationError {
  constructor(message: string, bucket?: string) {
    super(message, "STORAGE_CONNECTION_FAILED", bucket);
    this.name = "StorageConnectionError";
  }
}

export class InvalidStorageInputError extends StorageOperationError {
  constructor(message: string, key?: string) {
    super(message, "INVALID_STORAGE_INPUT", undefined, key);
    this.name = "InvalidStorageInputError";
  }
}
