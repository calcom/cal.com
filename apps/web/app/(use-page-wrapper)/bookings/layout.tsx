import { getTranslate } from "app/_utils";

import Shell from "@calcom/features/shell/Shell";

async function BookingsStatusLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslate();
  return (
    <Shell
      withoutMain={false}
      withoutSeo={true}
      hideHeadingOnMobile
      heading={t("bookings")}
      subtitle={t("bookings_description")}
      title={t("bookings")}
      description={t("bookings_description")}>
      {children}
    </Shell>
  );
}

export default BookingsStatusLayout;
