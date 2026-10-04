import { describe, expect, it } from "vitest";

import {
  createObjectStorageClient,
  getRawProviderArchivalService,
  InvalidStorageInputError,
  MemoryObjectStorageClient,
  ObjectNotFoundError,
  RawProviderArchivalService,
  S3CompatibleObjectStorageClient,
  StorageConnectionError,
  StoragePermissionError,
} from "../storage/src";

describe("S3-Compatible Object Storage Abstraction", () => {
  describe("Object Upload & Content Integrity (putObject)", () => {
    it("uploads Buffer content and computes accurate SHA-256 checksum", async () => {
      const client = new MemoryObjectStorageClient("test-bucket");
      const content = Buffer.from("FastCharger Raw Ingestion Payload", "utf-8");

      const result = await client.putObject({
        key: "test/payload.txt",
        body: content,
        contentType: "text/plain",
      });

      expect(result.key).toBe("test/payload.txt");
      expect(result.bucket).toBe("test-bucket");
      expect(result.sizeBytes).toBe(content.length);
      expect(result.checksumSha256).toBeDefined();
      expect(result.checksumSha256.length).toBe(64);
      expect(result.etag).toBeDefined();
    });

    it("uploads string JSON payloads seamlessly", async () => {
      const client = new MemoryObjectStorageClient();
      const jsonString = JSON.stringify({ provider: "ocm", stationsCount: 42 });

      const result = await client.putObject({
        key: "dumps/stations.json",
        body: jsonString,
        contentType: "application/json",
      });

      expect(result.key).toBe("dumps/stations.json");
      expect(result.sizeBytes).toBe(Buffer.byteLength(jsonString));
    });

    it("rejects empty or whitespace-only keys with InvalidStorageInputError", async () => {
      const client = new MemoryObjectStorageClient();

      await expect(
        client.putObject({
          key: "   ",
          body: "data",
        }),
      ).rejects.toThrow(InvalidStorageInputError);
    });
  });

  describe("Object Retrieval & Metadata (getObject & headObject)", () => {
    it("downloads stored object and preserves payload byte-for-byte", async () => {
      const client = new MemoryObjectStorageClient();
      const rawText = "Canonical FastCharger CSV Export\nStation,City,Power\n";
      const key = "exports/bangalore_chargers.csv";

      await client.putObject({
        key,
        body: rawText,
        contentType: "text/csv",
        metadata: {
          exportedBy: "admin",
          city: "Bengaluru",
        },
      });

      const downloaded = await client.getObject({ key });

      expect(downloaded.key).toBe(key);
      expect(downloaded.contentType).toBe("text/csv");
      expect(downloaded.body.toString("utf-8")).toBe(rawText);
      expect(downloaded.contentLength).toBe(Buffer.byteLength(rawText));
      expect(downloaded.metadata.city).toBe("Bengaluru");
      expect(downloaded.metadata.exportedBy).toBe("admin");
      expect(downloaded.lastModified).toBeInstanceOf(Date);
    });

    it("inspects object metadata via headObject without reading entire body", async () => {
      const client = new MemoryObjectStorageClient();
      const key = "reports/ingestion-20261004.json";

      await client.putObject({
        key,
        body: JSON.stringify({ status: "success", count: 120 }),
        contentType: "application/json",
        metadata: { jobId: "job-999" },
      });

      const head = await client.headObject({ key });

      expect(head.exists).toBe(true);
      expect(head.key).toBe(key);
      expect(head.contentType).toBe("application/json");
      expect(head.metadata?.jobId).toBe("job-999");
      expect(head.lastModified).toBeInstanceOf(Date);
    });

    it("deletes object and verifies headObject returns exists: false", async () => {
      const client = new MemoryObjectStorageClient();
      const key = "temp/temporary-file.bin";

      await client.putObject({ key, body: "temporary content" });
      const beforeDelete = await client.headObject({ key });
      expect(beforeDelete.exists).toBe(true);

      const deleteRes = await client.deleteObject({ key });
      expect(deleteRes.deleted).toBe(true);

      const afterDelete = await client.headObject({ key });
      expect(afterDelete.exists).toBe(false);
    });
  });

  describe("Missing Object Error Handling", () => {
    it("throws ObjectNotFoundError when attempting to download non-existent object", async () => {
      const client = new MemoryObjectStorageClient("my-bucket");

      await expect(
        client.getObject({ key: "definitely/missing/file.json" }),
      ).rejects.toThrow(ObjectNotFoundError);
    });

    it("returns exists: false on headObject for missing object without throwing", async () => {
      const client = new MemoryObjectStorageClient();
      const head = await client.headObject({ key: "non-existent-key.txt" });

      expect(head.exists).toBe(false);
      expect(head.contentLength).toBeUndefined();
    });
  });

  describe("Signed URL Generation & Access Delegation", () => {
    it("creates secure, time-limited signed URLs for getObject operation", async () => {
      const client = new MemoryObjectStorageClient("secure-bucket");

      const url = await client.createSignedUrl({
        key: "private/raw_export.json.gz",
        operation: "getObject",
        expiresInSeconds: 300,
      });

      expect(url).toContain("https://storage.fastcharger.local/secure-bucket/private%2Fraw_export.json.gz");
      expect(url).toContain("operation=getObject");
      expect(url).toContain("expires=");
      expect(url).toContain("signature=");
    });

    it("creates signed upload URLs for putObject operation", async () => {
      const client = new MemoryObjectStorageClient();

      const url = await client.createSignedUrl({
        key: "incoming/partner_dump.json",
        operation: "putObject",
        expiresInSeconds: 600,
      });

      expect(url).toContain("operation=putObject");
      expect(url).toContain("expires=");
      expect(url).toContain("signature=");
    });
  });

  describe("Security & Permissions", () => {
    it("throws StoragePermissionError when storage access is denied", async () => {
      const client = new MemoryObjectStorageClient("restricted-bucket");
      client.setSimulatePermissionDenied(true);

      await expect(
        client.putObject({
          key: "secret/data.json",
          body: "secret",
        }),
      ).rejects.toThrow(StoragePermissionError);

      await expect(
        client.getObject({ key: "secret/data.json" }),
      ).rejects.toThrow(StoragePermissionError);
    });

    it("instantiates S3-compatible client with private-by-default bucket semantics", () => {
      const s3Client = new S3CompatibleObjectStorageClient({
        provider: "minio",
        endpoint: "http://localhost:9000",
        defaultBucket: "fastcharger-private",
        accessKeyId: "mockKey",
        secretAccessKey: "mockSecret",
      });

      expect(s3Client.providerType).toBe("minio");
      expect(s3Client.defaultBucket).toBe("fastcharger-private");
    });
  });

  describe("Storage Connection & Provider Failure Resilience", () => {
    it("maps network connection failures to StorageConnectionError", () => {
      const error = new StorageConnectionError(
        "Failed connecting to object storage endpoint: connect ECONNREFUSED 127.0.0.1:9000",
        "fastcharger-raw",
      );

      expect(error).toBeInstanceOf(StorageConnectionError);
      expect(error.code).toBe("STORAGE_CONNECTION_FAILED");
      expect(error.bucket).toBe("fastcharger-raw");
      expect(error.message).toContain("ECONNREFUSED");
    });

    it("creates memory client via factory when provider is set to memory", () => {
      const client = createObjectStorageClient({ provider: "memory", defaultBucket: "memory-bucket" });
      expect(client.providerType).toBe("memory");
      expect(client.defaultBucket).toBe("memory-bucket");
    });
  });

  describe("Worker Raw Provider Archival Service", () => {
    it("archives raw provider responses with deterministic key path and checksum", async () => {
      const memoryClient = new MemoryObjectStorageClient("raw-provider-archive");
      const archivalService = new RawProviderArchivalService(memoryClient);

      const sampleOcmPayload = {
        DataProvider: "Open Charge Map",
        Records: [{ ID: 104231, AddressInfo: { Title: "Koramangala Fast Charger" } }],
      };

      const result = await archivalService.archiveRawPayload({
        provider: "open-charge-map",
        jobId: "sync-run-20261004-01",
        payload: sampleOcmPayload,
        retentionDays: 90,
      });

      expect(result.bucket).toBe("raw-provider-archive");
      expect(result.provider).toBe("open-charge-map");
      expect(result.jobId).toBe("sync-run-20261004-01");
      expect(result.contentType).toBe("application/json");
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.checksumSha256).toBeDefined();
      expect(result.retentionDays).toBe(90);

      // Key must follow deterministic date partitioning
      expect(result.objectKey).toMatch(/^providers\/open-charge-map\/\d{4}\/\d{2}\/\d{2}\/open-charge-map_sync-run-20261004-01_\d+\.json$/);

      // Verify the object actually exists in the storage bucket
      const retrieved = await memoryClient.getObject({ key: result.objectKey });
      expect(retrieved.body.toString("utf-8")).toContain("Koramangala Fast Charger");
    });

    it("generates time-limited signed download URLs from archival service", async () => {
      const memoryClient = new MemoryObjectStorageClient();
      const archivalService = new RawProviderArchivalService(memoryClient);

      const signedUrl = await archivalService.createSignedDownloadUrl(
        "providers/kazam/2026/10/04/dump.json",
        1800,
      );

      expect(signedUrl).toContain("https://storage.fastcharger.local/");
      expect(signedUrl).toContain("operation=getObject");
      expect(signedUrl).toContain("expires=");
      expect(signedUrl).toContain("signature=");
    });

    it("provides a singleton instance via getRawProviderArchivalService", () => {
      const instance1 = getRawProviderArchivalService();
      const instance2 = getRawProviderArchivalService();
      expect(instance1).toBe(instance2);
    });
  });
});
