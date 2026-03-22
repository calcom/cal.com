import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";

export async function GET() {
  const scenarios = await prisma.testScenario.findMany({
    select: {
      id: true,
      name: true,
      scenario: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(scenarios);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, scenario } = body;

  if (!name || !scenario) {
    return NextResponse.json({ error: "name and scenario are required" }, { status: 400 });
  }

  const saved = await prisma.testScenario.create({
    data: {
      name,
      scenario,
    },
    select: {
      id: true,
      name: true,
      scenario: true,
      createdAt: true,
    },
  });

  return NextResponse.json(saved, { status: 201 });
}
