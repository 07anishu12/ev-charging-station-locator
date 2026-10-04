CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"state_id" uuid NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"station_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "city_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias" text NOT NULL,
	"city_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"ocm_connection_id" integer,
	"connection_type" text NOT NULL,
	"normalized_type" text NOT NULL,
	"level" text,
	"power_kw" numeric(8, 2),
	"voltage" integer,
	"amps" integer,
	"status" text DEFAULT 'unknown' NOT NULL,
	"quantity" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_quality_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid,
	"ocm_id" integer,
	"issue_type" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"description" text NOT NULL,
	"details" jsonb,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operators_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pincodes" (
	"pincode" varchar(6) PRIMARY KEY NOT NULL,
	"city_id" uuid,
	"state_id" uuid,
	"district" text,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"code" text,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "states_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'open-charge-map' NOT NULL,
	"country" text DEFAULT 'IN' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"records_fetched" integer DEFAULT 0 NOT NULL,
	"records_created" integer DEFAULT 0 NOT NULL,
	"records_updated" integer DEFAULT 0 NOT NULL,
	"records_skipped" integer DEFAULT 0 NOT NULL,
	"records_failed" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
ALTER TABLE "stations" ALTER COLUMN "external_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "ocm_id" integer;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "operator_id" uuid;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "state_id" uuid;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "district" text;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "pincode" varchar(6);--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "latitude" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "longitude" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "status" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "usage_type" text;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "data_provider" text DEFAULT 'Open Charge Map' NOT NULL;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "data_license" text;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "ocm_url" text;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "last_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_aliases" ADD CONSTRAINT "city_aliases_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_quality_issues" ADD CONSTRAINT "data_quality_issues_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pincodes" ADD CONSTRAINT "pincodes_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pincodes" ADD CONSTRAINT "pincodes_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cities_state_id_idx" ON "cities" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "cities_station_count_idx" ON "cities" USING btree ("station_count");--> statement-breakpoint
CREATE INDEX "city_aliases_alias_idx" ON "city_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "city_aliases_city_id_idx" ON "city_aliases" USING btree ("city_id");--> statement-breakpoint
CREATE UNIQUE INDEX "city_aliases_alias_city_unique_idx" ON "city_aliases" USING btree ("alias","city_id");--> statement-breakpoint
CREATE INDEX "connectors_station_id_idx" ON "connectors" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "connectors_normalized_type_idx" ON "connectors" USING btree ("normalized_type");--> statement-breakpoint
CREATE INDEX "connectors_ocm_connection_id_idx" ON "connectors" USING btree ("ocm_connection_id");--> statement-breakpoint
CREATE INDEX "data_quality_issues_station_id_idx" ON "data_quality_issues" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "data_quality_issues_ocm_id_idx" ON "data_quality_issues" USING btree ("ocm_id");--> statement-breakpoint
CREATE INDEX "data_quality_issues_issue_type_idx" ON "data_quality_issues" USING btree ("issue_type");--> statement-breakpoint
CREATE INDEX "data_quality_issues_resolved_idx" ON "data_quality_issues" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "operators_name_idx" ON "operators" USING btree ("name");--> statement-breakpoint
CREATE INDEX "pincodes_city_id_idx" ON "pincodes" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "pincodes_state_id_idx" ON "pincodes" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "pincodes_coordinates_idx" ON "pincodes" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "states_name_idx" ON "states" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "sync_logs_status_idx" ON "sync_logs" USING btree ("status");--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stations_ocm_id_idx" ON "stations" USING btree ("ocm_id");--> statement-breakpoint
CREATE INDEX "stations_city_id_idx" ON "stations" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "stations_state_id_idx" ON "stations" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "stations_operator_id_idx" ON "stations" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "stations_status_idx" ON "stations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stations_pincode_idx" ON "stations" USING btree ("pincode");--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_ocm_id_unique" UNIQUE("ocm_id");