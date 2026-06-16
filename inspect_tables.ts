import mysql from "mysql2/promise";

async function main() {
  const tidbUrl = "mysql://2mjn1VtPmQgzpMg.eaebecac2c2f:bzeve1lCKktPB19k147o@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/SRrXkzo3YQ7qW8GU5VPaHC?ssl={\"rejectUnauthorized\":true}";
  console.log("Connecting to TiDB Cloud production database...");
  const connection = await mysql.createConnection(tidbUrl);
  console.log("Connected successfully!");

  const [tables] = await connection.query("SHOW TABLES");
  const tableNames = tables.map((row: any) => Object.values(row)[0]);

  console.log("\nTable names in DB:");
  for (const name of tableNames) {
    console.log(`- ${name}`);
  }

  await connection.end();
}

main().catch(console.error);
