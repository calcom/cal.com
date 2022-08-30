import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Button } from "@calcom/ui/v2";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import { List, ListItem, ListItemText, ListItemTitle } from "@calcom/ui/v2/modules/List";
import DisconnectIntegration from "@calcom/ui/v2/modules/integrations/DisconnectIntegration";

const ConferencingLayout = () => {
  const { t } = useLocale();

  const { data: apps, isLoading } = trpc.useQuery([
    "viewer.integrations",
    { variant: "conferencing", onlyInstalled: true },
  ]);

  return (
    <div className="w-full bg-white sm:mx-0 xl:mt-0">
      <Meta title="conferencing" description="conferencing_description" />
      <List roundContainer={true}>
        {apps.map((app) => (
          <ListItem rounded={false} className="flex-col border-0" key={app.title}>
            <div className="flex w-full flex-1 items-center space-x-3 pl-1 pt-1 rtl:space-x-reverse">
              {
                // eslint-disable-next-line @next/next/no-img-element
                app.logo && <img className="h-10 w-10" src={app.logo} alt={app.title} />
              }
              <div className="flex-grow truncate pl-2">
                <ListItemTitle component="h3" className="mb-1 space-x-2">
                  <h3 className="truncate text-sm font-medium text-neutral-900">{app.title}</h3>
                </ListItemTitle>
                <ListItemText component="p">{app.description}</ListItemText>
              </div>
              <div>
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button StartIcon={Icon.FiMoreHorizontal} size="icon" color="secondary" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <DisconnectIntegration
                        credentialId={app.credentialId}
                        label={t("remove_app")}
                        trashIcon
                        isGlobal={app.isGlobal}
                      />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </Dropdown>
              </div>
              {/* <div className="flex w-1/2 space-x-6">
                <img className="h-10 w-10" src={app.logo} alt={app.title} />

                <div className=" truncate pl-2">
                  <h3 className="truncate text-sm font-medium text-neutral-900">{app.title}</h3>
                  <p className="truncate text-sm text-gray-500">{app.description}</p>
                </div>
              </div>

              <div>
                <Dropdown>
                  <DropdownMenuTrigger className="focus:ring-brand-900 block h-[36px] w-auto justify-center  rounded-md border border-gray-200 bg-transparent text-gray-700 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1">
                    <Icon.FiMoreHorizontal className="group-hover:text-gray-800" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <DisconnectIntegration
                        credentialId={app.credentialId}
                        label={t("remove_app")}
                        trashIcon
                        isGlobal={app.isGlobal}
                      />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </Dropdown>
              </div> */}
            </div>
          </ListItem>
        ))}
      </List>
    </div>
  );
};

ConferencingLayout.getLayout = getLayout;

export default ConferencingLayout;
