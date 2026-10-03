import { Redis } from "@upstash/redis";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const FILE_PATH = resolve(process.cwd(), "data/kv-store.json");

type FileStore = Record<string, unknown>;

function readFileStore(): FileStore {
  if (!existsSync(FILE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(FILE_PATH, "utf8")) as FileStore;
  } catch {
    return {};
  }
}

function writeFileStore(data: FileStore) {
  const dir = resolve(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (r) {
    const v = await r.get<T>(key);
    return v ?? null;
  }
  const store = readFileStore();
  return (store[key] as T) ?? null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.set(key, value);
    return;
  }
  const store = readFileStore();
  store[key] = value;
  writeFileStore(store);
}

export async function kvDel(key: string): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.del(key);
    return;
  }
  const store = readFileStore();
  delete store[key];
  writeFileStore(store);
}
