import { useLocale } from "@calcom/lib/hooks/useLocale";
import isCalcom from "@calcom/lib/isCalcom";
import { trpc } from "@calcom/trpc/react";

export function UpgradeTip({
  title,
  description,
  background,
  features,
  buttons,
  children,
}: {
  title: string;
  description: string;
  background: string;
  features: Array<{ icon: JSX.Element; title: string; description: string }>;
  buttons?: JSX.Element;
  children: JSX.Element;
}) {
  const { data, isLoading } = trpc.viewer.teams.list.useQuery(undefined, {});
  const teams = data?.filter((m) => m.accepted) || [];
  const { t } = useLocale();

  return (
    <>
      {!teams.length && !isLoading && (
        <>
          {!isCalcom ? (
            <div className="-mt-6 rtl:ml-4 md:rtl:ml-0">
              <div
                className="flex w-full justify-between overflow-hidden rounded-lg pt-4 pb-10 md:min-h-[295px] md:pt-10"
                style={{
                  background: "url(" + background + ")",
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                }}>
                <div className="mt-3 px-8 sm:px-14">
                  <h1 className="font-cal text-3xl">{t(title)}</h1>
                  <p className="my-4 max-w-sm text-gray-600">{t(description)}</p>
                  {buttons}
                </div>
              </div>
              <div className="mt-4 grid-cols-3 md:grid md:gap-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="mb-4 min-h-[180px] w-full rounded-md bg-gray-50 p-8 md:mb-0">
                    {feature.icon}
                    <h2 className="font-cal mt-4 text-lg">{feature.title}</h2>
                    <p className="text-gray-700">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            children
          )}
        </>
      )}
    </>
  );
}
