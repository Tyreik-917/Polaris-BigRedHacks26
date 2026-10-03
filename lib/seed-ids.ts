import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { SeedIds } from "@/lib/types";

const SEED_PATH = resolve(process.cwd(), "data/seed-ids.json");

export function loadSeedIds(): SeedIds | null {
  if (!existsSync(SEED_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SEED_PATH, "utf8")) as SeedIds;
  } catch {
    return null;
  }
}

export function resolveMayaCustomerId(): string | null {
  const seed = loadSeedIds();
  if (seed?.maya.customerId) return seed.maya.customerId;
  const env = process.env.NESSIE_CUSTOMER_ID?.trim();
  return env || null;
}
