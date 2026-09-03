import { sql } from "@vercel/postgres";

let ready = false;

async function init() {
  if (ready) return;
  await sql`
    CREATE TABLE IF NOT EXISTS kv (
      key        text PRIMARY KEY,
      value      jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
  ready = true;
}

export async function getKey(key, fallback = null) {
  await init();
  const { rows } = await sql`SELECT value FROM kv WHERE key = ${key}`;
  return rows.length ? rows[0].value : fallback;
}

export async function setKey(key, value) {
  await init();
  await sql`
    INSERT INTO kv (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now()`;
}

export const EMPTY_STATE = {
  positions: { mark: [], ron: [], guy: [] },
  cash: { mark: "", ron: "", guy: "" },
  deposits: { mark: "", ron: "", guy: "" },
};
