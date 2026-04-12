import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_URL || "./database.db";

let sqlite: Database;
try {
	sqlite = new Database(dbPath, { create: true });
	sqlite.run("PRAGMA journal_mode = WAL");
	sqlite.run("PRAGMA foreign_keys = ON");
} catch (error) {
	console.error(`Failed to initialize database at ${dbPath}:`, error);
	process.exit(1);
}

const db = drizzle({ client: sqlite, schema });

await migrate(db, { migrationsFolder: "./drizzle" });

export { db, schema };
