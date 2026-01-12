import type { FunctionComponent, SVGProps } from "react";

import { InstallAppButton } from "@calcom/app-store/InstallAppButton";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";

interface AdditionalCalendarSelectorProps {
  isPending?: boolean;
}

const AdditionalCalendarSelector = ({ isPending }: AdditionalCalendarSelectorProps): JSX.Element | null => {
  const { t } = useLocale();
  const [data] = trpc.viewer.apps.integrations.useSuspenseQuery({ variant: "calendar", onlyInstalled: true });

  const options = data.items.map((item) => ({
    label: item.name,
    slug: item.slug,
    image: item.logo,
    type: item.type,
  }));
  options.push({
    label: "Add new calendars",
    slug: "add-new",
    image: "",
    type: "new_other",
  });

  return (
    <Dropdown modal={false}>
      <DropdownMenuTrigger asChild>
        <Button StartIcon="plus" color="secondary" {...(isPending && { loading: isPending })}>
          {t("add")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((data) => (
          <DropdownMenuItem key={data.slug} className="focus:outline-none">
            {data.slug === "add-new" ? (
              <DropdownItem StartIcon="plus" color="minimal" href="/apps/categories/calendar">
                {t("install_new_calendar_app")}
              </DropdownItem>
            ) : (
              <InstallAppButton
                type={data.type}
                render={(installProps) => {
                  const props = { ...installProps } as FunctionComponent<SVGProps<SVGSVGElement>>;
                  return (
                    <DropdownItem {...props} color="minimal" type="button">
                      <span className="flex items-center gap-x-2">
                        {data.image && <img className="h-5 w-5" src={data.image} alt={data.label} />}
                        {`${t("add")} ${data.label}`}
                      </span>
                    </DropdownItem>
                  );
                }}
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};

export default AdditionalCalendarSelector;
