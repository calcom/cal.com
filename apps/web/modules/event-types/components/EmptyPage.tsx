import { useLocale } from "@calcom/lib/hooks/useLocale";

const SkeletonEventType = () => {
  return (
    <div className="bg-default dark:bg-cal-muted h-24 w-full">
      <div className="p-5">
        <div className="flex space-x-2 rtl:space-x-reverse">
          <div className="bg-subtle dark:bg-default h-2 w-1/6 rounded-md" />
          <div className="bg-subtle dark:bg-default h-2 w-1/6 rounded-md" />
        </div>
        <div className="flex space-x-2 py-2 rtl:space-x-reverse">
          <div className="bg-subtle dark:bg-default h-2 w-1/12 rounded-md" />
          <div className="bg-subtle dark:bg-default h-2 w-1/6 rounded-md" />
          <div className="bg-subtle dark:bg-default h-2 w-1/12 rounded-md" />
        </div>
        <div className="flex space-x-2 py-1 rtl:space-x-reverse">
          <div className="bg-subtle dark:bg-default h-6 w-1/6 rounded-md" />
          <div className="bg-subtle dark:bg-default h-6 w-1/6 rounded-md" />
        </div>
      </div>
    </div>
  );
};

function EmptyPage({ name }: { name: string }) {
  const { t } = useLocale();
  return (
    <div className="relative text-center">
      <div className="flex flex-col divide-y-2 blur-[3px] dark:divide-subtle dark:opacity-70">
        <SkeletonEventType />
        <SkeletonEventType />
        <SkeletonEventType />
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
        <h3 className="text-emphasis text-lg font-semibold">{t("no_event_types")} </h3>
        <h4 className="text-default text-sm leading-normal">{t("no_event_types_description", { name })}</h4>
      </div>
    </div>
  );
}

export default EmptyPage;
