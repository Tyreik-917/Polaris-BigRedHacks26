import { Redis } from "@upstash/redis";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { resolve } from "path";

const FILE_PATH = resolve(process.cwd(), "data/kv-store.json");

type FileStore = Record<string, unknown>;

/**
 * Local fallback when Redis isn't configured. Kept in memory and mirrored to
 * disk when the filesystem allows it (it doesn't on Vercel), so a read-only
 * disk degrades to per-instance memory instead of crashing every write.
 */
let memoryStore: FileStore | null = null;
let diskWritable = true;
/** mtime of the file when last read/written; a change means it was edited outside. */
let diskMtimeMs = 0;

function fileMtimeMs(): number {
  try {
    return statSync(FILE_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

function readFileStore(): FileStore {
  if (memoryStore && (!diskWritable || fileMtimeMs() === diskMtimeMs)) {
    return memoryStore;
  }
  diskMtimeMs = fileMtimeMs();
  memoryStore = {};
  if (existsSync(FILE_PATH)) {
    try {
      memoryStore = JSON.parse(readFileSync(FILE_PATH, "utf8")) as FileStore;
    } catch {
      /* corrupt file: start empty */
    }
  }
  return memoryStore;
}

function writeFileStore(data: FileStore) {
  memoryStore = data;
  if (!diskWritable) return;
  try {
    const dir = resolve(process.cwd(), "data");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
    diskMtimeMs = fileMtimeMs();
  } catch (e) {
    diskWritable = false;
    console.warn(
      "[kv] data/kv-store.json is not writable; keeping state in memory only. Set KV_REST_API_URL/KV_REST_API_TOKEN for persistence.",
      e,
    );
  }
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
