import { Database } from "bun:sqlite";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const dbPath =
	process.env.DATABASE || join(import.meta.dir, "..", "..", "sqlite.db");

let sqlite: Database;
try {
	sqlite = new Database(dbPath);
	sqlite.run("PRAGMA journal_mode = WAL");
	sqlite.run("PRAGMA foreign_keys = ON");
} catch (error) {
	console.error(`Failed to initialize database at ${dbPath}:`, error);
	process.exit(1);
}

const db = drizzle({ client: sqlite, schema });

export { db, schema };
