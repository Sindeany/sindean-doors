import mysql from "mysql2/promise";

const tablesToClear = [
  "door_orders",
  "distributor_orders",
  "distributor_payments",
  "complaints",
  "complaint_messages",
  "work_orders",
  "tax_invoices",
  "qc_inspections",
  "packing_orders",
  "post_order_reviews",
  "decision_log",
  "journal_entries",
  "journal_lines"
];

async function main() {
  const tidbUrl = "mysql://2mjn1VtPmQgzpMg.eaebecac2c2f:bzeve1lCKktPB19k147o@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/SRrXkzo3YQ7qW8GU5VPaHC?ssl={\"rejectUnauthorized\":true}";
  
  console.log("Connecting to TiDB Cloud production database...");
  const connection = await mysql.createConnection(tidbUrl);
  console.log("Connected successfully!");

  console.log("Disabling foreign key checks...");
  await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

  for (const table of tablesToClear) {
    console.log(`Clearing table: ${table}...`);
    try {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
      console.log(`- Cleared ${table} successfully.`);
    } catch (err: any) {
      console.error(`- Error clearing ${table}:`, err.message);
    }
  }

  console.log("Re-enabling foreign key checks...");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

  // Log remaining table row counts to verify
  console.log("\nVerifying remaining row counts in cleared tables:");
  for (const table of tablesToClear) {
    try {
      const [rows]: any = await connection.query(`SELECT COUNT(*) as count FROM \`${table}\``);
      console.log(`- ${table}: ${rows[0].count} rows`);
    } catch (err: any) {
      console.error(`- Error counting ${table}:`, err.message);
    }
  }

  await connection.end();
  console.log("\nDone!");
}

main().catch(console.error);
