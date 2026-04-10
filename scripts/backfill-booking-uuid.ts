import { v7 as uuidv7 } from "uuid";

import { prisma } from "@calcom/prisma";

// Production-safe backfill for `Booking.uuid`. Each batch is a small
// `$transaction` of type-safe `prisma.booking.update` calls — no raw
// write SQL, no interpolated values, fully parameterized by Prisma. A
// rate limit between batches keeps pressure off autovacuum, WAL, and
// replication.
//
// Design constraints this satisfies for prod:
//   - Each write goes through `prisma.booking.update`, so the generated
//     SQL is parameterized and type-checked by Prisma.
//   - Batches are small so per-transaction lock windows stay short.
//   - `DELAY_MS` between batches gives autovacuum + WAL writer breathing
//     room and caps replication lag growth.
//   - Idempotent resume: the SELECT targets only rows that still need
//     work (NULL uuid OR zero-timestamp uuid), so the script is safe to
//     interrupt and re-run — it picks up where it left off without
//     rewriting already-fixed rows.
//   - Graceful SIGINT/SIGTERM: finish the in-flight batch, then exit.
//
// Targets:
//   - `uuid IS NULL` — rows that predate the uuid column write path
//     from PR #1512 (most of the production table).
//   - `uuid::text LIKE '00000000-%'` — rows written under uuid@10, which
//     had a `v7({ msecs })` bug producing zero-timestamp UUIDs on the
//     first in-process call. Fixed by the uuid@11 upgrade; existing
//     broken rows need to be rewritten so `ORDER BY uuid DESC` matches
//     `ORDER BY startTime DESC`.
//
// Operational notes:
//   - Run this AFTER the uuid@11 upgrade has deployed to every writer.
//     Otherwise new writes keep landing as zero-timestamp uuids and the
//     backfill keeps catching them forever.
//   - Run it BEFORE the `ALTER COLUMN uuid SET NOT NULL` migration. The
//     migration's fast-path depends on every row already having a uuid.
const BATCH_SIZE = 100;
const DELAY_MS = 100;

type Row = { id: number; startTime: Date };

let shuttingDown = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    if (!shuttingDown) {
      console.log(`\nReceived ${sig}, finishing current batch then exiting…`);
      shuttingDown = true;
    }
  });
}

async function backfillBookingUuid() {
  let totalUpdated = 0;
  const started = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Raw SQL for the SELECT only — Prisma's generated UUID-typed `where`
    // doesn't expose LIKE/startsWith, so we can't write this filter via
    // the Prisma client. The SELECT is parameterized by Prisma's tagged
    // template (`${BATCH_SIZE}` binds as $1).
    const bookings = await prisma.$queryRaw<Row[]>`
      SELECT id, "startTime"
      FROM "Booking"
      WHERE uuid IS NULL OR uuid::text LIKE '00000000-%'
      ORDER BY id ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (bookings.length === 0) break;

    // Type-safe writes via prisma.booking.update. Each update is a
    // Prisma-generated parameterized query; no interpolation, no raw SQL
    // on the write path. The transaction groups the batch into a single
    // atomic unit — if the process dies mid-batch, the idempotent SELECT
    // filter picks up the unfinished rows on the next run.
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
    const elapsedSec = Math.round((Date.now() - started) / 1000);
    const rps = elapsedSec > 0 ? Math.round(totalUpdated / elapsedSec) : totalUpdated;
    console.log(
      `Backfilled ${totalUpdated} bookings (last id: ${lastId}, ${rps} rows/sec, ${elapsedSec}s elapsed)`
    );

    if (shuttingDown) break;

    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  const elapsedSec = Math.round((Date.now() - started) / 1000);
  console.log(`Done. Total backfilled: ${totalUpdated} in ${elapsedSec}s`);
}

backfillBookingUuid()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
