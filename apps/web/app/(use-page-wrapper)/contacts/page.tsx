import ContactsPage from "@calid/features/modules/contacts/pages/ContactsPage";
import { _generateMetadata, getTranslate } from "app/_utils";

import Shell from "@calcom/features/shell/Shell";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("contacts"),
    (t) => t("contacts_description"),
    undefined,
    undefined,
    "/contacts"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <Shell heading={t("contacts")} subtitle={t("contacts_description")}>
      <ContactsPage />
    </Shell>
  );
};

export default Page;
