import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const sqlPath = path.join(process.cwd(), "schema.sql");
  
  if (!fs.existsSync(sqlPath)) {
    console.error("schema.sql not found. Run 'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema.sql' first.");
    return;
  }

  let sqlContent = fs.readFileSync(sqlPath, "utf8");
  
  // Remove BOM if present
  if (sqlContent.charCodeAt(0) === 0xFEFF) {
    sqlContent = sqlContent.slice(1);
  }

  const statements = sqlContent
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} SQL statements. Executing...`);
  if (statements.length === 0) {
    console.log("SQL Content preview:", sqlContent.substring(0, 100));
  }

  for (const statement of statements) {
    try {
      await client.execute(statement);
      console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
    } catch (err: any) {
      if (err.message.includes("already exists")) {
        console.warn(`⚠️ Warning: ${err.message}`);
      } else {
        console.error(`❌ Error executing statement:`);
        console.error(statement);
        console.error(err.message);
      }
    }
  }

  console.log("🚀 Turso Schema Synchronization Complete!");
}

main().catch(console.error);
