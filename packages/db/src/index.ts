import { Database } from "bun:sqlite";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const dbPath = process.env.DATABASE || join(import.meta.dir, "..", "sqlite.db");
const sqlite = new Database(dbPath);
const db = drizzle({ client: sqlite, schema });

export { db, schema };
