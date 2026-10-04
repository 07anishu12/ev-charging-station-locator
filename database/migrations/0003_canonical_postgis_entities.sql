CREATE TABLE IF NOT EXISTS "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"state_id" uuid NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "districts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "localities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"city_id" uuid NOT NULL,
	"state_id" uuid,
	"district_id" uuid,
	"pincode" varchar(6),
	"latitude" double precision,
	"longitude" double precision,
	"location" geography(Point,4326),
	"station_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "station_provider_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"provider_name" text NOT NULL,
	"provider_station_id" text NOT NULL,
	"raw_data" jsonb,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'unverified' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "districts" ADD CONSTRAINT "districts_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "localities" ADD CONSTRAINT "localities_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "localities" ADD CONSTRAINT "localities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "localities" ADD CONSTRAINT "localities_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "station_provider_mappings" ADD CONSTRAINT "station_provider_mappings_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "districts_state_id_idx" ON "districts" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "districts_slug_idx" ON "districts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "districts_name_idx" ON "districts" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "localities_city_id_idx" ON "localities" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "localities_slug_idx" ON "localities" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "localities_city_slug_unique_idx" ON "localities" USING btree ("city_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "localities_location_gist_idx" ON "localities" USING gist ("location");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "station_provider_unique_idx" ON "station_provider_mappings" USING btree ("provider_name","provider_station_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "station_provider_station_id_idx" ON "station_provider_mappings" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stations_verification_status_idx" ON "stations" USING btree ("verification_status");
