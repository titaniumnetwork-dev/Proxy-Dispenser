import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_URL || "./database.db";

let sqlite: Database.Database;
try {
	sqlite = new Database(dbPath);
	sqlite.pragma("journal_mode = WAL");
	sqlite.pragma("foreign_keys = ON");
} catch (error) {
	console.error(`Failed to initialize database at ${dbPath}:`, error);
	process.exit(1);
}

const db = drizzle({ client: sqlite, schema });

migrate(db, { migrationsFolder: "./drizzle" });

export { db, schema };
