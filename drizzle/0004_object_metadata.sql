CREATE TABLE IF NOT EXISTS "object_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" text NOT NULL,
	"bucket" text NOT NULL,
	"content_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" text,
	"source" text NOT NULL,
	"provider" text,
	"job_id" text,
	"retention_days" integer,
	"expires_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "object_metadata_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "object_metadata_key_unique_idx" ON "object_metadata" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "object_metadata_bucket_idx" ON "object_metadata" USING btree ("bucket");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "object_metadata_source_idx" ON "object_metadata" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "object_metadata_provider_idx" ON "object_metadata" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "object_metadata_job_id_idx" ON "object_metadata" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "object_metadata_created_at_idx" ON "object_metadata" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "object_metadata_expires_at_idx" ON "object_metadata" USING btree ("expires_at");
