import { Icon } from "@calid/features/ui/components/icon";

import dayjs from "@calcom/dayjs";

interface ProBadgeProps {
  yearClaimed?: number;
  validTillDate?: string;
  isMobile?: boolean;
}

export function ProBadge({ yearClaimed, validTillDate, isMobile }: ProBadgeProps) {
  if (!yearClaimed || yearClaimed <= 0) {
    return null;
  }

  const formatValidTill = (dateString?: string) => {
    if (!dateString) return null;

    try {
      const date = dayjs(dateString);
      if (!date.isValid()) return null;
      return date.format("DD MMM, YYYY");
    } catch {
      return null;
    }
  };

  const formattedDate = formatValidTill(validTillDate);
  const isExpired = validTillDate && dayjs.utc(validTillDate).isBefore(dayjs.utc());

  return isMobile ? (
    <div className="text-default ml-2 flex items-center gap-1 text-xs">
      {/* <Icon name="sparkles" className="h-4 w-4 text-blue-500" /> */}
      <span className="font-bold text-blue-500">Pro</span>
    </div>
  ) : (
    <div className="text-default text-md mb-8 flex flex-col rounded-xl border border-blue-300 bg-blue-100 p-2">
      <div className="mb-2 flex flex-row items-center">
        <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-md bg-blue-200">
          <Icon name="sparkles" className="h-4 w-4 text-blue-500" />
        </div>
        <span className="mr-4 font-bold text-blue-500">PRO PLAN</span>
        <span className="ml-2 rounded-full bg-blue-200 px-2 py-1 font-semibold text-blue-500">Active</span>
      </div>
      {formattedDate && (
        <div className="flex items-start gap-1">
          <span className="text-default font-normal">{isExpired ? "Expired" : "Expires"}</span>
          <span className="text-default font-semibold">{formattedDate}</span>
        </div>
      )}
    </div>
  );
}
