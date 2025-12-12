import { createKyselyDb } from "./factory";

const writeConnectionString =
  process.env.DATABASE_URL || "postgresql://postgres:@localhost:5450/calendso";

const kyselyWrite = createKyselyDb({ connectionString: writeConnectionString });

export default kyselyWrite;
