import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { Pool } from "pg";
import { CANONICAL_PINCODES } from "../../lib/geo/canonical-pincodes";
import { MOCK_CITIES, MOCK_OPERATORS, MOCK_STATES, MOCK_STATIONS } from "../../lib/mock/data";

async function seed() {
  const dbUrl = process.env.DATABASE_URL || "postgresql://localhost:5433/fastcharger";
  const pool = new Pool({ connectionString: dbUrl });

  console.log("Connecting to database:", dbUrl);

  try {
    // 1. Seed States
    console.log("Seeding states...");
    for (const state of MOCK_STATES) {
      await pool.query(
        `INSERT INTO states (name, slug, code, latitude, longitude, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name, code = EXCLUDED.code, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;`,
        [state.name, state.slug, state.code, state.latitude, state.longitude]
      );
    }

    const stateMap = new Map<string, string>();
    const stateRows = await pool.query(`SELECT id, slug FROM states`);
    for (const row of stateRows.rows) {
      stateMap.set(row.slug, row.id);
    }

    // 2. Seed Cities
    console.log("Seeding cities...");
    for (const city of MOCK_CITIES) {
      const stateId = stateMap.get(city.stateSlug) || null;
      if (!stateId) continue;

      await pool.query(
        `INSERT INTO cities (name, slug, state_id, latitude, longitude, station_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name, state_id = EXCLUDED.state_id, latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude, station_count = EXCLUDED.station_count;`,
        [city.name, city.slug, stateId, city.latitude, city.longitude, city.stationCount]
      );
    }

    const cityMap = new Map<string, string>();
    const cityRows = await pool.query(`SELECT id, slug FROM cities`);
    for (const row of cityRows.rows) {
      cityMap.set(row.slug, row.id);
    }

    // 3. Seed Operators
    console.log("Seeding operators...");
    for (const op of MOCK_OPERATORS) {
      await pool.query(
        `INSERT INTO operators (name, slug, website, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name, website = EXCLUDED.website;`,
        [op.name, op.slug, op.website]
      );
    }

    const operatorMap = new Map<string, string>();
    const opRows = await pool.query(`SELECT id, slug FROM operators`);
    for (const row of opRows.rows) {
      operatorMap.set(row.slug, row.id);
    }

    // 4. Seed Canonical Pincodes
    console.log("Seeding canonical pincodes...");
    for (const [pin, info] of Object.entries(CANONICAL_PINCODES)) {
      const stateId = stateMap.get(info.stateSlug) || null;
      const cityId = cityMap.get(info.citySlug) || null;

      await pool.query(
        `INSERT INTO pincodes (pincode, city_id, state_id, district, latitude, longitude, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (pincode) DO UPDATE
         SET city_id = EXCLUDED.city_id, state_id = EXCLUDED.state_id, district = EXCLUDED.district,
             latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;`,
        [pin, cityId, stateId, info.district, info.latitude, info.longitude]
      );
    }

    // 5. Seed Stations
    console.log("Seeding stations with PostGIS geography...");
    for (const st of MOCK_STATIONS) {
      const stateId = stateMap.get(st.state.slug) || null;
      const cityId = cityMap.get(st.city.slug) || null;
      const operatorId = operatorMap.get(st.operator.slug) || null;

      await pool.query(
        `INSERT INTO stations (
          external_id, ocm_id, name, slug, operator_id, address,
          city_id, state_id, district, pincode, latitude, longitude,
          location, status, usage_type, data_provider, data_license, ocm_url,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          ST_SetSRID(ST_MakePoint($12, $11), 4326)::geography,
          $13, $14, $15, $16, $17,
          NOW(), NOW()
        )
        ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            operator_id = EXCLUDED.operator_id,
            address = EXCLUDED.address,
            city_id = EXCLUDED.city_id,
            state_id = EXCLUDED.state_id,
            district = EXCLUDED.district,
            pincode = EXCLUDED.pincode,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            location = EXCLUDED.location,
            status = EXCLUDED.status,
            usage_type = EXCLUDED.usage_type;`,
        [
          st.id,
          st.ocmId,
          st.name,
          st.slug,
          operatorId,
          st.address,
          cityId,
          stateId,
          st.district,
          st.pincode,
          st.latitude,
          st.longitude,
          st.status,
          st.usageType,
          st.dataProvider,
          st.dataLicense,
          st.ocmUrl,
        ]
      );
    }

    // 6. Seed Connectors
    console.log("Seeding connectors...");
    for (const st of MOCK_STATIONS) {
      const stationRes = await pool.query(`SELECT id FROM stations WHERE slug = $1`, [st.slug]);
      if (stationRes.rows.length === 0) continue;
      const stationDbId = stationRes.rows[0].id;

      // Delete existing connectors for this station to avoid duplicate inserts on re-seed
      await pool.query(`DELETE FROM connectors WHERE station_id = $1`, [stationDbId]);

      for (const conn of st.connectors) {
        await pool.query(
          `INSERT INTO connectors (
            station_id, connection_type, normalized_type, power_kw, voltage, amps, status, quantity, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
          );`,
          [
            stationDbId,
            conn.type,
            conn.normalizedType,
            conn.powerKw,
            conn.voltage || null,
            conn.amps || null,
            conn.status,
            conn.quantity,
          ]
        );
      }
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await pool.end();
  }
}

seed();
