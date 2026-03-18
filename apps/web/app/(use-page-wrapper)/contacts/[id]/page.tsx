import ContactDetailPage from "@calid/features/modules/contacts/pages/ContactDetailPage";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { notFound } from "next/navigation";
import { z } from "zod";

import Shell from "@calcom/features/shell/Shell";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Contact Details",
    () => "View contact details and meeting history",
    undefined,
    undefined,
    "/contacts"
  );

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate();

  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    notFound();
  }

  return (
    <Shell heading={t("contacts")} subtitle={t("contacts_description")} backPath="/contacts">
      <ContactDetailPage contactId={parsed.data.id} />
    </Shell>
  );
};

export default Page;
