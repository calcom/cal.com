import PickTimeSlots from "@calcom/features/one-time-booking/PickTimeSlots";
import { getLayout } from "@calcom/features/troubleshooter/layout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HeadSeo } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const OneTimeBooking = () => {
  const { t } = useLocale();

  return (
    <>
      <HeadSeo title={t("one_time_link")} description={t("one_time_link_description")} />
      <PickTimeSlots />
    </>
  );
};

OneTimeBooking.getLayout = getLayout;
OneTimeBooking.PageWrapper = PageWrapper;
export default OneTimeBooking;
