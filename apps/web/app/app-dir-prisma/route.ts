import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
let cold = true;
export async function GET() {
  const coldStart = cold;
  cold = false;
  const startImport = performance.now();
  const prisma = (await import("@calcom/prisma")).default;
  const endImport = performance.now();
  const startCount = performance.now();
  const totalUsers = await prisma.user.count();
  const endCount = performance.now();

  return NextResponse.json({
    coldStart,
    totalUsers,
    prismaQueryTime: endCount - startCount,
    prismaImportTime: endImport - startImport,
    date: new Date().toISOString(),
  });
}
