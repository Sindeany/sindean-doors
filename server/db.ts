import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const isProduction = process.env.NODE_ENV === "production";

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  ...(isProduction ? { ssl: { rejectUnauthorized: true } } : {}),
});

export const db = drizzle(pool, { schema, mode: "default" });
export { schema };
