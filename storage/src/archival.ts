import { getDefaultStorageClient } from "./client";
import { ObjectStorageClient, PutObjectOutput } from "./types";

export interface ArchiveRawPayloadOptions {
  provider: string;
  jobId: string;
  source?: string;
  payload: string | Buffer | Record<string, unknown>;
  storageClient?: ObjectStorageClient;
  bucket?: string;
  retentionDays?: number;
}

export interface ArchivedPayloadMetadata {
  objectKey: string;
  bucket: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  source: string;
  provider: string;
  jobId: string;
  retentionDays?: number;
  createdAt: Date;
}

export class RawProviderArchivalService {
  private readonly storageClient: ObjectStorageClient;

  constructor(storageClient?: ObjectStorageClient) {
    this.storageClient = storageClient || getDefaultStorageClient();
  }

  public generateObjectKey(provider: string, jobId: string, timestamp: Date = new Date()): string {
    const year = timestamp.getUTCFullYear();
    const month = String(timestamp.getUTCMonth() + 1).padStart(2, "0");
    const day = String(timestamp.getUTCDate()).padStart(2, "0");
    const safeProvider = provider.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "-");

    return `providers/${safeProvider}/${year}/${month}/${day}/${safeProvider}_${safeJobId}_${timestamp.getTime()}.json`;
  }

  public async archiveRawPayload(
    options: ArchiveRawPayloadOptions,
  ): Promise<ArchivedPayloadMetadata> {
    const client = options.storageClient || this.storageClient;
    const now = new Date();
    const objectKey = this.generateObjectKey(options.provider, options.jobId, now);

    const bodyBuffer = Buffer.isBuffer(options.payload)
      ? options.payload
      : typeof options.payload === "string"
        ? Buffer.from(options.payload, "utf-8")
        : Buffer.from(JSON.stringify(options.payload), "utf-8");

    const putResult: PutObjectOutput = await client.putObject({
      key: objectKey,
      bucket: options.bucket,
      body: bodyBuffer,
      contentType: "application/json",
      metadata: {
        provider: options.provider,
        jobId: options.jobId,
        source: options.source || "worker-ingestion",
        retentionDays: String(options.retentionDays || 180),
      },
    });

    return {
      objectKey: putResult.key,
      bucket: putResult.bucket,
      contentType: "application/json",
      sizeBytes: putResult.sizeBytes,
      checksumSha256: putResult.checksumSha256,
      source: options.source || "worker-ingestion",
      provider: options.provider,
      jobId: options.jobId,
      retentionDays: options.retentionDays || 180,
      createdAt: now,
    };
  }

  public async createSignedDownloadUrl(
    objectKey: string,
    expiresInSeconds: number = 900,
    bucket?: string,
  ): Promise<string> {
    return this.storageClient.createSignedUrl({
      key: objectKey,
      bucket,
      operation: "getObject",
      expiresInSeconds,
    });
  }
}

let globalArchivalService: RawProviderArchivalService | null = null;

export function getRawProviderArchivalService(): RawProviderArchivalService {
  if (!globalArchivalService) {
    globalArchivalService = new RawProviderArchivalService();
  }
  return globalArchivalService;
}
