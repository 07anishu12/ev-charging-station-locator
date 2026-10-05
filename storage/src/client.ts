import { LocalObjectStorageClient } from "./local";
import { MemoryObjectStorageClient } from "./memory";
import { S3CompatibleObjectStorageClient } from "./s3";
import { ObjectStorageClient, StorageConfig, StorageProviderType } from "./types";

export function createObjectStorageClient(config: StorageConfig = {}): ObjectStorageClient {
  const provider: StorageProviderType =
    config.provider || (process.env.STORAGE_PROVIDER as StorageProviderType | undefined) || "s3";

  if (provider === "local") return new LocalObjectStorageClient();

  if (provider === "memory") {
    return new MemoryObjectStorageClient(config.defaultBucket || "fastcharger-raw");
  }

  return new S3CompatibleObjectStorageClient({
    ...config,
    provider,
  });
}

let globalStorageClient: ObjectStorageClient | null = null;

export function getDefaultStorageClient(): ObjectStorageClient {
  if (!globalStorageClient) {
    globalStorageClient = createObjectStorageClient();
  }
  return globalStorageClient;
}

export function resetDefaultStorageClient(): void {
  globalStorageClient = null;
}
