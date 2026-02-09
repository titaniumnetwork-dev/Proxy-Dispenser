import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./packages/db/src/schema.ts",
	out: "./packages/db/drizzle",
	dialect: "sqlite",
	dbCredentials: {
		url: process.env.DATABASE || "./packages/db/sqlite.db",
	},
});
