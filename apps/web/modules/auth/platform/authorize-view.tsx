"use client";

import { useRouter } from "next/navigation";

import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants/permissions";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

import { hasPermission } from "../../../../../packages/platform/utils/permissions";

export default function Authorize() {
  const { t } = useLocale();
  const router = useRouter();

  const searchParams = useCompatSearchParams();
  const queryString = searchParams?.toString();

  // const { isLoading, error, data: client } = useOAuthClient(queryString);

  const client: {
    name: string;
    logo?: string;
    redirect_uris: string[];
    permissions: number;
  } = {
    name: "Acme.com",
    redirect_uris: ["", ""],
    permissions: 7,
  };

  const permissions = Object.values(PERMISSIONS_GROUPED_MAP).map((value) => {
    let permissionsMessage = "";
    const hasReadPermission = hasPermission(client.permissions, value.read);
    const hasWritePermission = hasPermission(client.permissions, value.write);

    if (hasReadPermission || hasWritePermission) {
      permissionsMessage = hasReadPermission ? "Read" : "Write";
    }

    if (hasReadPermission && hasWritePermission) {
      permissionsMessage = "Read, write";
    }

    return (
      !!permissionsMessage && (
        <li key={value.read} className="relative pl-5 text-sm">
          <span className="absolute left-0">&#10003;</span>
          {permissionsMessage} your {`${value.label}s`.toLocaleLowerCase()}
        </li>
      )
    );
  });

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mt-2 max-w-xl rounded-md bg-white px-9 pb-3 pt-2">
        <div className="flex items-center justify-center">
          {/*
           below is where the client logo will be displayed 
           first we check if the client has a logo property and display logo if present
           else we take logo from user profile pic
           */}
          {client.logo ? (
            <Avatar
              alt=""
              fallback={<Icon name="plus" className="text-subtle h-6 w-6" />}
              className="items-center"
              imageSrc={client.logo}
              size="lg"
            />
          ) : (
            <Avatar
              alt=""
              fallback={<Icon name="plus" className="text-subtle h-6 w-6" />}
              className="items-center"
              imageSrc="/cal-com-icon.svg"
              size="lg"
            />
          )}
          <div className="relative -ml-6 h-24 w-24">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-[70px] w-[70px] items-center justify-center  rounded-full bg-white">
                <img src="/cal-com-icon.svg" alt="Logo" className="h-16 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <h1 className="px-5 pb-5 pt-3 text-center text-2xl font-bold tracking-tight text-black">
          {t("access_cal_account", { clientName: client.name, appName: APP_NAME })}
        </h1>
        <div className="mb-4 mt-5 font-medium text-black">
          {t("allow_client_to", { clientName: client.name })}
        </div>
        <ul className="stack-y-4 text-sm text-black">{permissions}</ul>
        <div className="bg-subtle mb-8 mt-8 flex rounded-md p-3">
          <div>
            <Icon name="info" className="mr-1 mt-0.5 h-4 w-4" />
          </div>
          <div className="ml-1 ">
            <div className="mb-1 text-sm font-medium">
              {t("allow_client_to_do", { clientName: client.name })}
            </div>
            <div className="text-sm">{t("oauth_access_information", { appName: APP_NAME })}</div>{" "}
          </div>
        </div>
        <div className="border-subtle border- -mx-9 mb-4 border-b" />
        <div className="flex justify-end">
          <Button
            className="bg-primary-default mr-2 text-black"
            onClick={() => {
              router.back();
            }}>
            {t("go_back")}
          </Button>
          <Button data-testid="allow-button" className="bg-black text-white">
            {t("allow")}
          </Button>
        </div>
      </div>
    </div>
  );
}
