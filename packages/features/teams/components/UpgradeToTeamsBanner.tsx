import isCalcom from "@calcom/lib/isCalcom";
import { ButtonGroup } from "@calcom/ui";

import { useIsInTeam } from "../hooks/useIsInTeam";

export function UpgradeToTeamsBanner({ children }: { children: React.ReactNode }) {
  const { isInTeam, isLoading } = useIsInTeam();

  if (isLoading || (!isLoading && isInTeam) || isCalcom) return null;

  return (
    <div className="-mt-6 rtl:ml-4 md:rtl:ml-0">
      <div
        className="flex w-full justify-between overflow-hidden rounded-lg pt-4 pb-10 md:min-h-[295px] md:pt-10"
        style={{
          background: "url(/team-banner-background.jpg)",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}>
        <div className="mt-3 px-8 sm:px-14">{children}</div>
      </div>
    </div>
  );
}

UpgradeToTeamsBanner.Title = function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="font-cal text-3xl">{children}</h1>;
};

UpgradeToTeamsBanner.Description = function Description({ children }: { children: React.ReactNode }) {
  return <p className="my-4 max-w-sm text-gray-600">{children}</p>;
};

UpgradeToTeamsBanner.Buttons = function Buttons({ children }: { children: React.ReactElement }) {
  return (
    <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
      <ButtonGroup>{children}</ButtonGroup>
    </div>
  );
};
