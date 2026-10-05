CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE "stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"location" geography(Point,4326) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stations_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "stations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "stations_location_gist_idx" ON "stations" USING gist ("location");