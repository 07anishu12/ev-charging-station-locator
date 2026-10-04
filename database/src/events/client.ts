import { Db, MongoClient, MongoClientOptions } from "mongodb";
import { COLLECTION_SPECIFICATIONS } from "./schema";

export interface MongoClientConfig {
  uri?: string;
  dbName?: string;
  options?: MongoClientOptions;
}

export class MongoClientManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connected: boolean = false;
  private lastError: Error | null = null;
  private uri: string;
  private dbName: string;

  constructor(config: MongoClientConfig = {}) {
    this.uri =
      config.uri ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/fastcharger_events";
    this.dbName = config.dbName || "fastcharger_events";
  }

  public isAvailable(): boolean {
    return this.connected && this.db !== null;
  }

  public getLastError(): Error | null {
    return this.lastError;
  }

  public getDb(): Db | null {
    return this.db;
  }

  public getClient(): MongoClient | null {
    return this.client;
  }

  /**
   * Initializes MongoDB connection with failure isolation.
   * If MongoDB is unavailable (e.g. offline, bad credentials, refused connection),
   * this does NOT throw an uncaught exception, but marks the client as unavailable.
   */
  public async connect(): Promise<boolean> {
    if (this.connected && this.db) {
      return true;
    }

    try {
      const options: MongoClientOptions = {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
        maxPoolSize: 10,
        minPoolSize: 1,
      };

      this.client = new MongoClient(this.uri, options);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.connected = true;
      this.lastError = null;
      return true;
    } catch (err) {
      this.connected = false;
      this.db = null;
      this.lastError = err instanceof Error ? err : new Error(String(err));
      // Non-fatal warning — failure isolation ensures business APIs proceed
      return false;
    }
  }

  /**
   * Ensures all collection indexes and TTL policies exist in the MongoDB database.
   */
  public async ensureIndexes(): Promise<{ createdCount: number; errors: string[] }> {
    if (!this.db || !this.connected) {
      return { createdCount: 0, errors: ["MongoDB is not connected."] };
    }

    let createdCount = 0;
    const errors: string[] = [];

    for (const spec of Object.values(COLLECTION_SPECIFICATIONS)) {
      try {
        const collection = this.db.collection(spec.collectionName);

        for (const indexDef of spec.indexes) {
          try {
            await collection.createIndex(indexDef.keys, indexDef.options);
            createdCount++;
          } catch (idxErr) {
            errors.push(
              `Failed creating index ${indexDef.options.name} on ${spec.collectionName}: ${idxErr instanceof Error ? idxErr.message : String(idxErr)}`,
            );
          }
        }
      } catch (colErr) {
        errors.push(
          `Failed initializing collection ${spec.collectionName}: ${colErr instanceof Error ? colErr.message : String(colErr)}`,
        );
      }
    }

    return { createdCount, errors };
  }

  /**
   * Safely closes the MongoDB connection.
   */
  public async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // Ignore close errors
      } finally {
        this.client = null;
        this.db = null;
        this.connected = false;
      }
    }
  }
}

let globalClientManager: MongoClientManager | null = null;

export function getMongoClientManager(): MongoClientManager {
  if (!globalClientManager) {
    globalClientManager = new MongoClientManager();
  }
  return globalClientManager;
}

export function resetGlobalClientManager(): void {
  if (globalClientManager) {
    globalClientManager.close().catch(() => {});
    globalClientManager = null;
  }
}
