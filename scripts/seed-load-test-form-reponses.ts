/**
 * Run this script quickly as `npx dotenv -e .env -- npx tsx scripts/seed-load-test-form-reponses.ts` from the root of the repo.
 */
import { prisma } from "@calcom/prisma";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";

async function createTestForm(): Promise<App_RoutingForms_Form> {
  const user = await prisma.user.findFirstOrThrow({
    where: { email: "owner1-acme@example.com" },
  });
  if (!user) {
    throw new Error("owner1-acme@example.com not found");
  }
  const testForm =
    (await prisma.app_RoutingForms_Form.findFirst({
      where: { name: "Load Test Form" },
    })) ||
    (await prisma.app_RoutingForms_Form.create({
      data: {
        name: "Load Test Form",
        userId: user.id,
        fields: [
          {
            id: "test-field-1",
            type: "text",
            label: "Test Field",
            required: true,
          },
        ],
        routes: [
          {
            id: "test-route-1",
            action: { type: "customPageMessage", value: "Thank you" },
            isFallback: true,
            queryValue: { id: "test-route-1", type: "group" },
          },
        ],
      },
    }));

  return testForm;
}

/**
 * Creates a form in Acme's owner-1 account and creates 300,000 responses in it.
 */
async function createBulkResponsesAndExport(): Promise<void> {
  const testForm = await createTestForm();
  console.log(`Using form: ${testForm.id}`);

  const TOTAL_RESPONSES = 300000;
  const BATCH_SIZE = 1000;
  const NUM_BATCHES = Math.ceil(TOTAL_RESPONSES / BATCH_SIZE);

  for (let batch = 0; batch < NUM_BATCHES; batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min((batch + 1) * BATCH_SIZE, TOTAL_RESPONSES);
    const batchSize = batchEnd - batchStart;

    console.log(`Creating batch ${batch + 1}/${NUM_BATCHES} (responses ${batchStart + 1}-${batchEnd})...`);

    // Create responses in parallel within each batch
    const responsePromises = Array.from({ length: batchSize }, (_, i) => {
      const responseIndex = batchStart + i;
      return prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: `load-test-filler-${responseIndex}`,
          formId: testForm.id,
          response: {
            "test-field-1": {
              label: "Test Field",
              value: `Response ${responseIndex}`,
            },
          },
        },
      });
    });

    await Promise.all(responsePromises);

    console.log(`✓ Batch ${batch + 1} completed (${batchEnd}/${TOTAL_RESPONSES} total)`);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✓ Successfully created ${TOTAL_RESPONSES} responses`);
}

createBulkResponsesAndExport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
