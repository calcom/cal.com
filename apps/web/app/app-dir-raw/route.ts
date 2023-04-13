import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
let cold = true;

export async function GET() {
  const coldStart = cold;
  cold = false;
  const startImport = performance.now();
  const postgres = (await import("postgres")).default;
  const endImport = performance.now();
  const startConnection = performance.now();
  const sql = postgres(process.env.DATABASE_URL || "");
  const endConnection = performance.now();
  const startCount = performance.now();
  const [result] = await sql<Array<{ totalUSers?: number }>>`SELECT COUNT(id) as totalUsers FROM users`;
  const endCount = performance.now();

  return NextResponse.json({
    coldStart,
    ...result,
    pgImportTime: endImport - startImport,
    pgConnectionTime: endConnection - startConnection,
    pgQueryTime: endCount - startCount,
    date: new Date().toISOString(),
  });
}
