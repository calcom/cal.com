"use client";

import { useState } from "react";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Meta,
  Switch,
  Dropdown,
  Button,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownItem,
  DropdownMenuItem,
  Icon,
  showToast,
} from "@calcom/ui";

type AttributeItemProps = RouterOutputs["viewer"]["attributes"]["list"][number];

function AttributeItem({ attribute }: { attribute: AttributeItemProps }) {
  const [isEnabled, setIsEnabled] = useState(attribute.enabled);
  const mutation = trpc.viewer.attributes.toggleActive.useMutation({
    onSuccess: () => {
      showToast(t("attribute_updated_successfully"), "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handleToggle = (checked: boolean) => {
    // Optimistically update the local state
    setIsEnabled(checked);
    mutation.mutate(
      { attributeId: attribute.id },
      {
        onError: (err) => {
          setIsEnabled(!checked);
          showToast(err.message, "error");
        },
      }
    );
  };

  const { t } = useLocale();
  return (
    <ul className="focus-within:border-emphasis flex justify-between p-4" key={attribute.id}>
      <div>
        <h3 className="leadning-none text-sm font-semibold">{attribute.name}</h3>
        <p className="text-default leadning-none text-sm font-normal">{attribute.type}</p>
      </div>
      <div className="flex gap-4">
        <Switch checked={isEnabled} onCheckedChange={handleToggle} />
        <Dropdown modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="icon"
              color="secondary"
              StartIcon="ellipsis"
              className="ltr:radix-state-open:rounded-r-md rtl:radix-state-open:rounded-l-md"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[200px]">
            <DropdownMenuItem>
              <DropdownItem type="button" StartIcon="pencil">
                {t("edit")}
              </DropdownItem>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DropdownItem type="button" StartIcon="trash-2" color="destructive">
                {t("delete")}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </ul>
  );
}

function OrganizationAttributesPage() {
  const { t } = useLocale();
  const { data, isLoading } = trpc.viewer.attributes.list.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <>
      <Meta title="Attributes" description="Manage attributes for your team members" />

      <LicenseRequired>
        <div className="border-subtle bg-default flex flex-col gap-4 rounded-lg border p-6">
          {data && data?.length > 0 ? (
            <>
              <h2 className="text-emphasis leadning-none text-base font-semibold">{t("custom")}</h2>
              <li className="border-subtle bg-default divide-subtle flex flex-col divide-y rounded-lg border">
                {data?.map((attribute) => (
                  <AttributeItem attribute={attribute} key={attribute.id} />
                ))}
              </li>
              <Button
                className="w-fit"
                StartIcon="plus"
                color="minimal"
                href="/settings/organizations/attributes/create">
                {t("add")}
              </Button>
            </>
          ) : (
            <div className="flex w-full flex-col items-center justify-center p-14">
              <div className="bg-emphasis text-emphasis flex h-16 w-16 items-center justify-center rounded-full p-2">
                <Icon name="loader" />
              </div>
              <h2 className="font-cal text-emphasis mt-6 text-xl font-semibold leading-none">
                {t("add_attributes")}
              </h2>

              <p className="text-emphasis mt-3 text-sm font-normal leading-none">
                {t("add_attributes_description")}
              </p>
              <Button
                className="mt-8"
                StartIcon="plus"
                color="secondary"
                href="/settings/organizations/attributes/create">
                {t("new_attribute")}
              </Button>
            </div>
          )}
        </div>
      </LicenseRequired>
    </>
  );
}

OrganizationAttributesPage.getLayout = getLayout;

export default OrganizationAttributesPage;
