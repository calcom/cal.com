import type { Params } from "app/_types";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@calcom/prisma";

const availabilitySchema = z.object({
  schedules: z.array(
    z.object({
      name: z.string().default("Working Hours"),
      availability: z.array(
        z.object({
          days: z.array(z.number().min(0).max(6)),
          startTime: z.string(), // "09:00"
          endTime: z.string(), // "17:00"
        })
      ),
    })
  ),
});

async function getHandler(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "id is not a string" }, { status: 400 });
  }
  const mentorId = parseInt(id);
  if (isNaN(mentorId) || mentorId <= 0) {
    return NextResponse.json({ error: "Invalid mentor ID" }, { status: 400 });
  }

  const schedules = await prisma.schedule.findMany({
    where: { userId: mentorId },
    select: {
      id: true,
      name: true,
      timeZone: true,
      userId: true,
      availability: {
        select: {
          id: true,
          days: true,
          startTime: true,
          endTime: true,
          scheduleId: true,
        },
      },
    },
  });
  const cleanedSchedules = schedules.map((schedule) => ({
    id: schedule.id,
    name: schedule.name,
    timeZone: schedule.timeZone,
    availability: schedule.availability.map((slot) => ({
      days: slot.days,
      startTime: slot.startTime.toISOString().substring(11, 16), // "09:00"
      endTime: slot.endTime.toISOString().substring(11, 16), // "17:00"
    })),
  }));

  return NextResponse.json({ schedules: cleanedSchedules });
}

async function postHandler(req: NextRequest, { params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "id is not a string" }, { status: 400 });
  }
  const mentorId = parseInt(id);
  if (isNaN(mentorId) || mentorId <= 0) {
    return NextResponse.json({ error: "Invalid mentor ID" }, { status: 400 });
  }
  const body = await parseRequestData(req);
  const data = availabilitySchema.parse(body);

  // Clear existing schedules
  await prisma.schedule.deleteMany({
    where: { userId: mentorId },
  });

  // Create new schedules
  for (const schedule of data.schedules) {
    await prisma.schedule.create({
      data: {
        name: schedule.name,
        userId: mentorId,
        availability: {
          create: schedule.availability.map((slot) => ({
            days: slot.days,
            startTime: new Date(`1970-01-01T${slot.startTime}:00.000Z`),
            endTime: new Date(`1970-01-01T${slot.endTime}:00.000Z`),
          })),
        },
      },
    });
  }

  return NextResponse.json({ success: true });
}

export const GET = defaultResponderForAppDir(getHandler);
export const POST = defaultResponderForAppDir(postHandler);
