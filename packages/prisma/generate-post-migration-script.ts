import dotEnv from "dotenv";
import fs from "fs";
import path from "path";

dotEnv.config({ path: "../../.env" });

/** This is used for instance specific queries that need to be run post-migrations */
export default async function main() {
  if (!process.env.DATABASE_POST_MIGRATION_SCRIPT) {
    console.info("No post migration script found");
    return;
  }
  fs.writeFileSync(
    `${path.join(__dirname, "scripts")}/post-migration.sql`,
    process.env.DATABASE_POST_MIGRATION_SCRIPT
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
