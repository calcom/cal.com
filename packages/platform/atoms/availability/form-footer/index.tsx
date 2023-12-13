import { Timezone } from "availability/timezone";
import { Troubleshooter } from "availability/troubleshooter";

export function FormFooter() {
  return (
    <div className="min-w-40 col-span-3 hidden space-y-2 md:block lg:col-span-1">
      <div className="xl:max-w-80 w-full pr-4 sm:ml-0 sm:mr-36 sm:p-0">
        <Timezone />
        <hr className="border-subtle my-6 mr-8" />
        <Troubleshooter isDisplayBlock={false} />
      </div>
    </div>
  );
}
