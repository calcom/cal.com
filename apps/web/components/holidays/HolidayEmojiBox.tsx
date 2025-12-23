import { memo } from "react";

import { getHolidayEmoji } from "@calcom/lib/holidays/getHolidayEmoji";

interface HolidayEmojiBoxProps {
  holidayName: string;
}

export const HolidayEmojiBox = memo(function HolidayEmojiBox({ holidayName }: HolidayEmojiBoxProps) {
  const emoji = getHolidayEmoji(holidayName);

  return (
    <div className="bg-subtle dark:bg-emphasis flex h-10 w-10 items-center justify-center rounded-lg">
      <span className="text-xl">{emoji}</span>
    </div>
  );
});

