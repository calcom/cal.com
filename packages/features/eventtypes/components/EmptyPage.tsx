import { useLocale } from "@calcom/lib/hooks/useLocale";

const SkeletonEventType = () => {
  return (
    <div className="border-subtle bg-default group relative rounded-md border">
      <div className="block w-full px-2 py-4">
        <div className="mb-2 flex flex-row items-center gap-2">
          <div className="self-start p-2">
            <div className="bg-subtle h-6 w-6 rounded-md" />
          </div>
          <div className="mr-20 flex-1">
            <div className="bg-subtle mb-2 h-5 w-3/4 rounded-md" />
            <div className="space-y-1">
              <div className="bg-subtle h-3 w-full rounded-md" />
              <div className="bg-subtle h-3 w-5/6 rounded-md" />
              <div className="bg-subtle h-3 w-4/6 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex w-full flex-row items-center justify-between">
          <div className="flex space-x-2">
            <div className="bg-subtle h-4 w-16 rounded-md" />
            <div className="bg-subtle h-4 w-20 rounded-md" />
          </div>
          <div className="bg-subtle h-10 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
};

function EmptyPage({ name }: { name: string }) {
  const { t } = useLocale();
  return (
    <div className="relative text-center">
      <div className="flex flex-col divide-y-2 px-4 blur-[3px] lg:px-12">
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
