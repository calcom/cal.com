import { createKyselyDb } from "./factory";

const readConnectionString =
  process.env.DATABASE_READ_URL || process.env.DATABASE_URL || "postgresql://postgres:@localhost:5450/calendso";

const kyselyRead = createKyselyDb({ connectionString: readConnectionString });

export default kyselyRead;
