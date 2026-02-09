import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./index";

await migrate(db, { migrationsFolder: "./drizzle" });
