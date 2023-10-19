import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import { getLayout } from "@calcom/features/troubleshooter/layout";

import PageWrapper from "@components/PageWrapper";

function TroubleshooterPage() {
  // TODO: carry out the same logic for size based on the screen size
  const extraDays = 7;
  const startDate = dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();
  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar startHour={0} endHour={23} startDate={startDate} endDate={endDate} events={[]} />
    </div>
  );
}

TroubleshooterPage.getLayout = getLayout;
TroubleshooterPage.PageWrapper = PageWrapper;
export default TroubleshooterPage;
