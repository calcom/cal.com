import { FiGlobe } from "@calcom/ui/components/icon";

import { timeZone as localStorageTimeZone } from "@lib/clock";

import TimeOptions from "@components/booking/TimeOptions";

export function TimezoneDropdown({
  onChangeTimeZone,
}: {
  onChangeTimeZone: (newTimeZone: string) => void;
  timeZone?: string;
}) {
  const handleSelectTimeZone = (newTimeZone: string) => {
    onChangeTimeZone(newTimeZone);
    localStorageTimeZone(newTimeZone);
  };

  return (
    <>
      <div className="dark:focus-within:bg-darkgray-200 dark:bg-darkgray-100 dark:hover:bg-darkgray-200 focus-within:bg-emphasis hover:bg-subtle [&_svg]:focus-within:text-emphasis [&_p]:focus-within:text-emphasis dark:[&_svg]:focus-within:text-inverted dark:[&_p]:focus-within:text-inverted -mx-[2px] !mt-3 flex w-fit max-w-[20rem] items-center rounded-[4px] px-1 py-[2px] text-sm font-medium lg:max-w-[12rem]">
        <FiGlobe className="dark:text-darkgray-600 flex h-4 w-4 text-gray-600 ltr:mr-[2px] rtl:ml-[2px]" />
        <TimeOptions onSelectTimeZone={handleSelectTimeZone} />
      </div>
    </>
  );
}
