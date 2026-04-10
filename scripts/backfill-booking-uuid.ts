import { v7 as uuidv7 } from "uuid";

import prisma from "@calcom/prisma";

const BATCH_SIZE = 50;
const DELAY_MS = 100;

async function backfillBookingUuid() {
  let totalUpdated = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const bookings = await prisma.booking.findMany({
      where: { uuid: null },
      select: { id: true, startTime: true },
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
    });

    if (bookings.length === 0) break;

    await prisma.$transaction(
      bookings.map((b) =>
        prisma.booking.update({
          where: { id: b.id },
          data: { uuid: uuidv7({ msecs: b.startTime.getTime() }) },
        })
      )
    );

    totalUpdated += bookings.length;
    const lastId = bookings[bookings.length - 1].id;
    console.log(`Backfilled ${totalUpdated} bookings (last id: ${lastId})`);

    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  console.log(`Done. Total backfilled: ${totalUpdated}`);
}

backfillBookingUuid()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
