import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

// SSL يُفعّل فقط عند الطلب الصريح (DB_SSL=true) — للقواعد السحابية. قاعدة Hostinger المحلية لا تحتاجه.
const useSsl = process.env.DB_SSL === "true";

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  charset: "utf8mb4",
  ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
});

export const db = drizzle(pool, { schema, mode: "default" });
export { schema };
