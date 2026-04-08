/**
 * Benchmark seed script for validating missing index PRs.
 *
 * Creates a large, deterministic, easy-to-clean-up dataset for:
 *   - WebhookScheduledTriggers (1,000,000 rows)
 *   - AttributeOption          (100,000 rows)
 *   - AttributeToUser          (900,000 rows)
 *
 * Usage:
 *   npx dotenv -e .env -- npx tsx scripts/seed-missing-index-benchmark.ts seed
 *   npx dotenv -e .env -- npx tsx scripts/seed-missing-index-benchmark.ts cleanup
 *   npx dotenv -e .env -- npx tsx scripts/seed-missing-index-benchmark.ts seed --force
 *   npx dotenv -e .env -- npx tsx scripts/seed-missing-index-benchmark.ts --print-sql
 *
 * This script is a manual developer benchmark tool.
 * It is NOT wired into yarn db-seed, yarn dx, CI, or any automatic setup path.
 */

import { prisma } from "@calcom/prisma";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARKER = "idx_bench_missing_indexes";
const TEAM_SLUG = MARKER;
const TEAM_NAME = "Benchmark Org — Missing Indexes";

// Precomputed bcrypt hash for "benchmark" — avoids per-user hashing overhead
const SHARED_PASSWORD_HASH = "$2a$10$QKJqFjFMfJzCO2fMYUGBruSVPCWbhMqEE7.5g0HuGqGAZpN3dUTdC";

// Volume targets
const NUM_USERS = 20_000;
const NUM_ATTRIBUTES = 250;
const OPTIONS_PER_ATTRIBUTE = 400;
const TOTAL_ATTRIBUTE_OPTIONS = NUM_ATTRIBUTES * OPTIONS_PER_ATTRIBUTE; // 100,000
const NUM_WEBHOOKS = 50;
const NUM_BOOKINGS = 7_500;
const TOTAL_WEBHOOK_TRIGGERS = 1_000_000;
const TOTAL_ATTRIBUTE_TO_USER = 900_000;

// Batch sizes
const USER_BATCH = 2_000;
const PARENT_BATCH = 5_000;
const CHILD_BATCH = 25_000;

// Seeded PRNG (mulberry32) for deterministic generation
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

/** Pick a random element from an array using the seeded PRNG */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Shuffle an array in-place using the seeded PRNG (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function elapsed(start: bigint): string {
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function tableCount(table: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT count(*) as count FROM "${table}"`
  );
  return Number(result[0].count);
}

// ---------------------------------------------------------------------------
// Existence check
// ---------------------------------------------------------------------------

async function benchmarkExists(): Promise<boolean> {
  const team = await prisma.team.findFirst({ where: { slug: TEAM_SLUG } });
  return team !== null;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  const totalStart = process.hrtime.bigint();

  // -----------------------------------------------------------------------
  // Phase 1: Benchmark team/org
  // -----------------------------------------------------------------------
  let phaseStart = process.hrtime.bigint();
  console.log("\n[1/8] Creating benchmark team/org...");

  const team = await prisma.team.create({
    data: {
      name: TEAM_NAME,
      slug: TEAM_SLUG,
      isOrganization: true,
      metadata: { isOrganization: true },
    },
  });
  const teamId = team.id;
  console.log(`  Team id=${teamId}  (${elapsed(phaseStart)})`);

  // -----------------------------------------------------------------------
  // Phase 2: Users + passwords + memberships
  // -----------------------------------------------------------------------
  phaseStart = process.hrtime.bigint();
  console.log(`\n[2/8] Creating ${NUM_USERS.toLocaleString()} users + memberships...`);

  const userIds: number[] = [];
  for (let batch = 0; batch < NUM_USERS; batch += USER_BATCH) {
    const size = Math.min(USER_BATCH, NUM_USERS - batch);
    const userValues: string[] = [];
    for (let i = 0; i < size; i++) {
      const idx = batch + i;
      const email = `${MARKER}_user_${idx}@benchmark.local`;
      const username = `${MARKER}_user_${idx}`;
      // uuid is required on User; raw INSERT does not apply Prisma @default(uuid())
      userValues.push(
        `(gen_random_uuid(), '${email}', '${username}', 'Bench User ${idx}', true, 'CAL')`
      );
    }

    const inserted = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO "users" ("uuid", "email", "username", "name", "completedOnboarding", "identityProvider")
       VALUES ${userValues.join(",")}
       RETURNING "id"`
    );
    const batchIds = inserted.map((r) => r.id);
    userIds.push(...batchIds);

    // Passwords (bulk)
    if (batchIds.length > 0) {
      const pwValues = batchIds.map((id) => `('${SHARED_PASSWORD_HASH}', ${id})`).join(",");
      await prisma.$executeRawUnsafe(
        `INSERT INTO "UserPassword" ("hash", "userId") VALUES ${pwValues}`
      );
    }

    // Memberships (bulk)
    if (batchIds.length > 0) {
      const memValues = batchIds
        .map((id) => `(${teamId}, ${id}, true, 'MEMBER')`)
        .join(",");
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Membership" ("teamId", "userId", "accepted", "role") VALUES ${memValues}`
      );
    }
  }
  console.log(`  ${userIds.length.toLocaleString()} users created  (${elapsed(phaseStart)})`);

  // Fetch membership IDs (needed for AttributeToUser)
  phaseStart = process.hrtime.bigint();
  console.log("\n  Fetching membership IDs...");
  const memberships = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `SELECT m."id" FROM "Membership" m
     JOIN "users" u ON u."id" = m."userId"
     WHERE m."teamId" = ${teamId}
     AND u."email" LIKE '${MARKER}%'
     ORDER BY m."id"`
  );
  const membershipIds = memberships.map((r) => r.id);
  console.log(`  ${membershipIds.length.toLocaleString()} memberships fetched  (${elapsed(phaseStart)})`);

  // -----------------------------------------------------------------------
  // Phase 3: Attributes
  // -----------------------------------------------------------------------
  phaseStart = process.hrtime.bigint();
  console.log(`\n[3/8] Creating ${NUM_ATTRIBUTES} attributes...`);

  const attrIds: string[] = [];
  for (let batch = 0; batch < NUM_ATTRIBUTES; batch += PARENT_BATCH) {
    const size = Math.min(PARENT_BATCH, NUM_ATTRIBUTES - batch);
    const values: string[] = [];
    for (let i = 0; i < size; i++) {
      const idx = batch + i;
      const id = `${MARKER}_attr_${idx}`;
      const slug = `${MARKER}_attr_${idx}`;
      const name = `Bench Attr ${idx}`;
      // Raw INSERT does not apply @default(now()) / @updatedAt — timestamps required
      values.push(
        `('${id}', ${teamId}, 'SINGLE_SELECT'::"AttributeType", '${name}', '${slug}', true, NOW(), NOW())`
      );
    }

    const inserted = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "Attribute" ("id", "teamId", "type", "name", "slug", "enabled", "createdAt", "updatedAt")
       VALUES ${values.join(",")}
       RETURNING "id"`
    );
    attrIds.push(...inserted.map((r) => r.id));
  }
  console.log(`  ${attrIds.length} attributes created  (${elapsed(phaseStart)})`);

  // -----------------------------------------------------------------------
  // Phase 4: Attribute options (100,000)
  // -----------------------------------------------------------------------
  phaseStart = process.hrtime.bigint();
  console.log(`\n[4/8] Creating ${TOTAL_ATTRIBUTE_OPTIONS.toLocaleString()} attribute options...`);

  const optionIds: string[] = [];
  let optionCount = 0;
  for (let attrIdx = 0; attrIdx < attrIds.length; attrIdx++) {
    const attrId = attrIds[attrIdx];
    const values: string[] = [];
    for (let o = 0; o < OPTIONS_PER_ATTRIBUTE; o++) {
      const globalIdx = optionCount++;
      const id = `${MARKER}_opt_${globalIdx}`;
      const slug = `${MARKER}_opt_${globalIdx}`;
      const value = `Option ${globalIdx}`;
      values.push(`('${id}', '${attrId}', '${value}', '${slug}', false)`);
    }

    // Insert in sub-batches per attribute (400 rows each is small enough)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AttributeOption" ("id", "attributeId", "value", "slug", "isGroup")
       VALUES ${values.join(",")}`
    );
    optionIds.push(
      ...Array.from({ length: OPTIONS_PER_ATTRIBUTE }, (_, o) => {
        const globalIdx = attrIdx * OPTIONS_PER_ATTRIBUTE + o;
        return `${MARKER}_opt_${globalIdx}`;
      })
    );

    if ((attrIdx + 1) % 50 === 0) {
      console.log(`    ${((attrIdx + 1) * OPTIONS_PER_ATTRIBUTE).toLocaleString()} options...`);
    }
  }
  console.log(`  ${optionIds.length.toLocaleString()} options created  (${elapsed(phaseStart)})`);

  // -----------------------------------------------------------------------
  // Phase 5: AttributeToUser (900,000)
  // -----------------------------------------------------------------------
  phaseStart = process.hrtime.bigint();
  console.log(`\n[5/8] Creating ${TOTAL_ATTRIBUTE_TO_USER.toLocaleString()} attribute-to-user assignments...`);

  // Build the skewed distribution:
  //   50 hot options  x 8,000 members = 400,000
  //  500 warm options x   800 members = 400,000
  // 1000 cold options x   100 members = 100,000
  // Total: 900,000

  const shuffledOptions = shuffle([...optionIds]);
  const hotOptions = shuffledOptions.slice(0, 50);
  const warmOptions = shuffledOptions.slice(50, 550);
  const coldOptions = shuffledOptions.slice(550, 1550);

  const shuffledMembers = shuffle([...membershipIds]);

  let atuRowCount = 0;
  let atuBatchValues: string[] = [];

  const flushAtu = async () => {
    if (atuBatchValues.length === 0) return;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AttributeToUser" ("id", "memberId", "attributeOptionId", "createdAt")
       VALUES ${atuBatchValues.join(",")}
       ON CONFLICT ("memberId", "attributeOptionId") DO NOTHING`
    );
    atuBatchValues = [];
  };

  const addAtuRow = async (memberId: number, optionId: string) => {
    const id = `${MARKER}_atu_${atuRowCount}`;
    atuBatchValues.push(`('${id}', ${memberId}, '${optionId}', NOW())`);
    atuRowCount++;
    if (atuBatchValues.length >= CHILD_BATCH) {
      await flushAtu();
      if (atuRowCount % 100_000 === 0) {
        console.log(`    ${atuRowCount.toLocaleString()} assignments...`);
      }
    }
  };

  // Hot: 50 options x 8,000 members each
  for (const optId of hotOptions) {
    const selected = shuffledMembers.slice(0, 8_000);
    for (const memberId of selected) {
      await addAtuRow(memberId, optId);
    }
  }

  // Warm: 500 options x 800 members each
  for (const optId of warmOptions) {
    const start = Math.floor(rng() * (membershipIds.length - 800));
    const selected = shuffledMembers.slice(start, start + 800);
    for (const memberId of selected) {
      await addAtuRow(memberId, optId);
    }
  }

  // Cold: 1000 options x 100 members each
  for (const optId of coldOptions) {
    const start = Math.floor(rng() * (membershipIds.length - 100));
    const selected = shuffledMembers.slice(start, start + 100);
    for (const memberId of selected) {
      await addAtuRow(memberId, optId);
    }
  }

  await flushAtu();
  console.log(`  ${atuRowCount.toLocaleString()} assignments created  (${elapsed(phaseStart)})`);

  // -----------------------------------------------------------------------
  // Phase 6: Webhooks
  // -----------------------------------------------------------------------
  phaseStart = process.hrtime.bigint();
  console.log(`\n[6/8] Creating ${NUM_WEBHOOKS} webhooks...`);

  const webhookValues: string[] = [];
  const webhookIds: string[] = [];
  for (let i = 0; i < NUM_WEBHOOKS; i++) {
    const id = `${MARKER}_wh_${i}`;
    const url = `https://benchmark.local/${MARKER}/webhook/${i}`;
    webhookValues.push(`('${id}', '${url}', true)`);
    webhookIds.push(id);
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Webhook" ("id", "subscriberUrl", "active") VALUES ${webhookValues.join(",")}`
  );
  console.log(`  ${webhookIds.length} webhooks created  (${elapsed(phaseStart)})`);

  const hotWebhookIds = webhookIds.slice(0, 5);
  const coldWebhookIds = webhookIds.slice(5);

  // -----------------------------------------------------------------------
  // Phase 7: Bookings
  // -----------------------------------------------------------------------
  phaseStart = process.hrtime.bigint();
  console.log(`\n[7/8] Creating ${NUM_BOOKINGS.toLocaleString()} bookings...`);

  const bookingIds: number[] = [];
  for (let batch = 0; batch < NUM_BOOKINGS; batch += PARENT_BATCH) {
    const size = Math.min(PARENT_BATCH, NUM_BOOKINGS - batch);
    const values: string[] = [];
    for (let i = 0; i < size; i++) {
      const idx = batch + i;
      const uid = `${MARKER}_booking_${idx}`;
      const title = `Bench Booking ${idx}`;
      const startTime = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000 + idx * 60000
      ).toISOString();
      const endTime = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000 + idx * 60000 + 30 * 60000
      ).toISOString();
      // DB enum labels are @map values (e.g. ACCEPTED → "accepted"), not Prisma enum names
      values.push(
        `('${uid}', '${title}', 'accepted'::"BookingStatus", '${startTime}'::timestamptz, '${endTime}'::timestamptz)`
      );
    }

    const inserted = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO "Booking" ("uid", "title", "status", "startTime", "endTime")
       VALUES ${values.join(",")}
       RETURNING "id"`
    );
    bookingIds.push(...inserted.map((r) => r.id));
  }
  console.log(`  ${bookingIds.length.toLocaleString()} bookings created  (${elapsed(phaseStart)})`);

  // -----------------------------------------------------------------------
  // Phase 8: WebhookScheduledTriggers (1,000,000)
  // -----------------------------------------------------------------------
  phaseStart = process.hrtime.bigint();
  console.log(`\n[8/8] Creating ${TOTAL_WEBHOOK_TRIGGERS.toLocaleString()} webhook scheduled triggers...`);

  const payloadTypes = ["MEETING_STARTED", "MEETING_ENDED", "BEFORE_EVENT", "AFTER_EVENT"];
  const now = Date.now();

  let triggerCount = 0;
  let triggerBatch: string[] = [];

  const flushTriggers = async () => {
    if (triggerBatch.length === 0) return;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "WebhookScheduledTriggers" ("subscriberUrl", "payload", "startAfter", "jobName", "webhookId", "bookingId")
       VALUES ${triggerBatch.join(",")}`
    );
    triggerBatch = [];
  };

  // Distribution:
  //   300,000 stale:  startAfter <= now - 1 day
  //   250,000 due:    startAfter <= now AND > now - 1 day
  //   450,000 future: startAfter > now
  //
  // Nullability:
  //   85% non-null webhookId, 15% null webhookId
  //   80% non-null bookingId, 20% null bookingId
  //
  // Hotspot:
  //   5 hot webhooks own 50% of non-null webhookId rows
  //   45 cold webhooks own the other 50%

  for (let i = 0; i < TOTAL_WEBHOOK_TRIGGERS; i++) {
    // Time bucket
    let startAfter: Date;
    if (i < 300_000) {
      // Stale: 1-30 days ago
      const daysAgo = 1 + rng() * 29;
      startAfter = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    } else if (i < 550_000) {
      // Due now: 0-24 hours ago
      const hoursAgo = rng() * 24;
      startAfter = new Date(now - hoursAgo * 60 * 60 * 1000);
    } else {
      // Future: 1 minute to 30 days ahead
      const minutesAhead = 1 + rng() * 30 * 24 * 60;
      startAfter = new Date(now + minutesAhead * 60 * 1000);
    }

    // webhookId
    const hasWebhook = rng() < 0.85;
    let webhookId: string | null = null;
    if (hasWebhook) {
      // 50% of non-null go to hot webhooks
      if (rng() < 0.5) {
        webhookId = pick(hotWebhookIds);
      } else {
        webhookId = pick(coldWebhookIds);
      }
    }

    // bookingId
    const hasBooking = rng() < 0.8;
    const bookingId = hasBooking ? pick(bookingIds) : null;

    // payload
    const eventType = pick(payloadTypes);
    const payloadJson = JSON.stringify({
      triggerEvent: eventType,
      marker: MARKER,
    }).replace(/'/g, "''");

    const subscriberUrl = webhookId
      ? `https://benchmark.local/${MARKER}/webhook/${webhookId}`
      : `https://benchmark.local/${MARKER}/orphan`;

    const jobName = `${MARKER}_trigger_${i}`;

    const whIdSql = webhookId ? `'${webhookId}'` : "NULL";
    const bkIdSql = bookingId ? `${bookingId}` : "NULL";

    triggerBatch.push(
      `('${subscriberUrl}', '${payloadJson}', '${startAfter.toISOString()}'::timestamptz, '${jobName}', ${whIdSql}, ${bkIdSql})`
    );

    triggerCount++;
    if (triggerBatch.length >= CHILD_BATCH) {
      await flushTriggers();
      if (triggerCount % 100_000 === 0) {
        console.log(`    ${triggerCount.toLocaleString()} triggers...`);
      }
    }
  }

  await flushTriggers();
  console.log(`  ${triggerCount.toLocaleString()} triggers created  (${elapsed(phaseStart)})`);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  const totalElapsed = elapsed(totalStart);
  console.log("\n" + "=".repeat(70));
  console.log("BENCHMARK SEED COMPLETE");
  console.log("=".repeat(70));
  console.log(`Total time: ${totalElapsed}`);
  console.log(`\nTeam:       id=${teamId}  slug=${TEAM_SLUG}`);
  console.log(`Users:      ${userIds.length.toLocaleString()}`);
  console.log(`Memberships:${membershipIds.length.toLocaleString()}`);
  console.log(`Attributes: ${attrIds.length}`);
  console.log(`Options:    ${optionIds.length.toLocaleString()}`);
  console.log(`ATU:        ${atuRowCount.toLocaleString()}`);
  console.log(`Webhooks:   ${webhookIds.length}`);
  console.log(`Bookings:   ${bookingIds.length.toLocaleString()}`);
  console.log(`Triggers:   ${triggerCount.toLocaleString()}`);

  // Print hot IDs for benchmark queries
  const hotAttrId = attrIds[0];
  const hotOptionId = hotOptions[0];
  const hotWebhookId = hotWebhookIds[0];

  console.log(`\nHot attribute ID:  ${hotAttrId}`);
  console.log(`Hot option ID:     ${hotOptionId}`);
  console.log(`Hot webhook ID:    ${hotWebhookId}`);

  printBenchmarkSql(hotAttrId, hotOptionId, hotWebhookId);
}

// ---------------------------------------------------------------------------
// Print benchmark SQL
// ---------------------------------------------------------------------------

function printBenchmarkSql(
  hotAttrId: string,
  hotOptionId: string,
  hotWebhookId: string
) {
  console.log("\n" + "=".repeat(70));
  console.log("BENCHMARK QUERIES — paste into psql");
  console.log("=".repeat(70));

  console.log(`
-- 1. WebhookScheduledTriggers: stale cleanup
BEGIN;
EXPLAIN (ANALYZE, BUFFERS)
DELETE FROM "WebhookScheduledTriggers"
WHERE "startAfter" <= NOW() - INTERVAL '1 day';
ROLLBACK;

-- 2. WebhookScheduledTriggers: jobs due now
EXPLAIN (ANALYZE, BUFFERS)
SELECT "id", "jobName", "payload", "subscriberUrl", "webhookId"
FROM "WebhookScheduledTriggers"
WHERE "startAfter" <= NOW();

-- 3. WebhookScheduledTriggers: delete by webhook
BEGIN;
EXPLAIN (ANALYZE, BUFFERS)
DELETE FROM "WebhookScheduledTriggers"
WHERE "webhookId" = '${hotWebhookId}';
ROLLBACK;

-- 4. AttributeOption: options for one attribute
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "AttributeOption"
WHERE "attributeId" = '${hotAttrId}';

-- 5. AttributeToUser: assigned users for one option
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "AttributeToUser"
WHERE "attributeOptionId" = '${hotOptionId}';
`);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  const totalStart = process.hrtime.bigint();

  console.log("\nCleaning up benchmark data...");
  console.log(`Marker: ${MARKER}\n`);

  // Try to print entity IDs if they still exist
  const team = await prisma.team.findFirst({ where: { slug: TEAM_SLUG } });
  if (team) {
    console.log(`Found benchmark team id=${team.id}`);

    // Find hot IDs for reference
    const firstAttr = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "Attribute" WHERE "id" LIKE '${MARKER}%' LIMIT 1`
    );
    const firstOpt = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "AttributeOption" WHERE "id" LIKE '${MARKER}%' LIMIT 1`
    );
    const firstWh = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "Webhook" WHERE "id" LIKE '${MARKER}%' LIMIT 1`
    );
    if (firstAttr.length) console.log(`  Sample attribute: ${firstAttr[0].id}`);
    if (firstOpt.length) console.log(`  Sample option:    ${firstOpt[0].id}`);
    if (firstWh.length) console.log(`  Sample webhook:   ${firstWh[0].id}`);
  }

  // Delete in reverse dependency order
  const steps = [
    {
      name: "WebhookScheduledTriggers",
      sql: `DELETE FROM "WebhookScheduledTriggers" WHERE "jobName" LIKE '${MARKER}%'`,
    },
    {
      name: "WebhookScheduledTriggers (orphan, by payload marker)",
      sql: `DELETE FROM "WebhookScheduledTriggers" WHERE "payload" LIKE '%${MARKER}%'`,
    },
    {
      name: "AttributeToUser",
      sql: `DELETE FROM "AttributeToUser" WHERE "id" LIKE '${MARKER}%'`,
    },
    {
      name: "AttributeOption",
      sql: `DELETE FROM "AttributeOption" WHERE "id" LIKE '${MARKER}%'`,
    },
    {
      name: "Attribute",
      sql: `DELETE FROM "Attribute" WHERE "id" LIKE '${MARKER}%'`,
    },
    {
      name: "Booking",
      sql: `DELETE FROM "Booking" WHERE "uid" LIKE '${MARKER}%'`,
    },
    {
      name: "Webhook",
      sql: `DELETE FROM "Webhook" WHERE "id" LIKE '${MARKER}%'`,
    },
    {
      name: "Membership (via team)",
      sql: team
        ? `DELETE FROM "Membership" WHERE "teamId" = ${team.id}`
        : `SELECT 1`, // no-op if team not found
    },
    {
      name: "UserPassword",
      sql: `DELETE FROM "UserPassword" WHERE "userId" IN (SELECT "id" FROM "users" WHERE "email" LIKE '${MARKER}%')`,
    },
    {
      name: "User",
      sql: `DELETE FROM "users" WHERE "email" LIKE '${MARKER}%'`,
    },
    {
      name: "Team",
      sql: `DELETE FROM "Team" WHERE "slug" = '${TEAM_SLUG}'`,
    },
  ];

  for (const step of steps) {
    const start = process.hrtime.bigint();
    const result = await prisma.$executeRawUnsafe(step.sql);
    console.log(`  ${step.name}: ${result} rows deleted  (${elapsed(start)})`);
  }

  console.log(`\nCleanup complete  (${elapsed(totalStart)})`);
}

// ---------------------------------------------------------------------------
// Print SQL only (reuses saved hot IDs from existing data)
// ---------------------------------------------------------------------------

async function printSqlOnly() {
  const team = await prisma.team.findFirst({ where: { slug: TEAM_SLUG } });
  if (!team) {
    console.error("No benchmark data found. Run 'seed' first.");
    process.exit(1);
  }

  const attrs = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "Attribute" WHERE "id" LIKE '${MARKER}%' ORDER BY "id" LIMIT 1`
  );
  const opts = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "AttributeOption" WHERE "id" LIKE '${MARKER}%' ORDER BY "id" LIMIT 1`
  );
  const whs = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "Webhook" WHERE "id" LIKE '${MARKER}%' ORDER BY "id" LIMIT 1`
  );

  const hotAttrId = attrs[0]?.id ?? "<not found>";
  const hotOptionId = opts[0]?.id ?? "<not found>";
  const hotWebhookId = whs[0]?.id ?? "<not found>";

  printBenchmarkSql(hotAttrId, hotOptionId, hotWebhookId);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => !a.startsWith("-")) ?? "";
  const force = args.includes("--force");
  const printSql = args.includes("--print-sql");

  if (printSql && !mode) {
    await printSqlOnly();
    return;
  }

  if (mode === "cleanup") {
    await cleanup();
    return;
  }

  if (mode === "seed") {
    const exists = await benchmarkExists();
    if (exists && !force) {
      console.error(
        `Benchmark data already exists (team slug="${TEAM_SLUG}").\n` +
          `Run 'cleanup' first, or use '--force' to delete and reseed.`
      );
      process.exit(1);
    }
    if (exists && force) {
      console.log("--force: cleaning up existing benchmark data first...");
      await cleanup();
    }
    await seed();
    return;
  }

  console.log(`Usage:
  npx dotenv -e .env -- npx tsx scripts/seed-missing-index-benchmark.ts seed [--force]
  npx dotenv -e .env -- npx tsx scripts/seed-missing-index-benchmark.ts cleanup
  npx dotenv -e .env -- npx tsx scripts/seed-missing-index-benchmark.ts --print-sql

Modes:
  seed      Create the benchmark dataset (fails if it already exists unless --force)
  cleanup   Delete all benchmark-tagged rows
  --print-sql  Print the EXPLAIN ANALYZE queries without seeding`);
}

main()
  .catch((err) => {
    console.error("Benchmark script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
