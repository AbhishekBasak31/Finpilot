import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsPath = path.join(__dirname, "migrations");

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const files = (await fs.readdir(migrationsPath))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const result = await client.query(
        `SELECT 1 FROM schema_migrations WHERE migration_name = $1`,
        [file]
      );

      if (result.rowCount > 0) {
        console.log(`Already applied: ${file}`);
        continue;
      }

      const migrationSQL = await fs.readFile(
        path.join(migrationsPath, file),
        "utf8"
      );

      console.log(`Applying: ${file}`);

      await client.query(migrationSQL);

      await client.query(
        `INSERT INTO schema_migrations (migration_name) VALUES ($1)`,
        [file]
      );

      console.log(`Applied: ${file}`);
    }

    await client.query("COMMIT");

    console.log("All migrations completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Migration failed.");
    console.error(error);

    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();