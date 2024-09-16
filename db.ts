import { JSONFile } from "lowdb/node";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { Low } from "lowdb";

class Database {
  private db: Low<any>;
  constructor(file: string) {
    file = join(import.meta.dirname, "/database/", file);

    const adapter = new JSONFile(file);
    this.db = new Low(adapter, {});
  }
  async init() {
    await this.db.read();
    this.db.data ||= {} as any;
    await this.db.write();
  }
  async get(key: string) {
    await this.init();
    return this.db.data?.[key];
  }
  async set(key: string, value: any) {
    await this.init();
    this.db.data![key] = value;
    await this.db.write();
    return value;
  }
  async clear() {
    await this.init();
    this.db.data = {};
    await this.db.write();
  }
}

const users = new Database("/users.json");
const requested = new Database("/requested.json");
const links = new Database("/links.json");
const bans = new Database("/bans.json");

async function initDatabase() {
  const dir = join(import.meta.dirname, "/database/");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export { users, requested, links, bans, initDatabase };
