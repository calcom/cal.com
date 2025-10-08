"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownItem,
  DropdownMenuItem,
} from "@calcom/ui/components/dropdown";
import { Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateAttributesList } from "@calcom/web/app/(use-page-wrapper)/settings/organizations/(org-user-only)/members/actions";

import { DeleteAttributeModal } from "./DeleteAttributeModal";
import { ListSkeleton } from "./ListSkeleton";

type AttributeItemProps = RouterOutputs["viewer"]["attributes"]["list"][number];

const TypeToLabelMap = {
  TEXT: "Text",
  NUMBER: "Number",
  SINGLE_SELECT: "Single-select",
  MULTI_SELECT: "Multi-select",
};

function AttributeItem({
  attribute,
  setAttributeToDelete,
  permissions,
}: {
  attribute: AttributeItemProps;
  setAttributeToDelete: Dispatch<SetStateAction<AttributeItemProps | undefined>>;
  permissions: { canEdit: boolean; canDelete: boolean };
}) {
  const { t } = useLocale();
  const [isEnabled, setIsEnabled] = useState(attribute.enabled);
  const mutation = trpc.viewer.attributes.toggleActive.useMutation({
    onSuccess: () => {
      showToast(t("attribute_updated_successfully"), "success");
      revalidateAttributesList();
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

  return (
    <ul className="focus-within:border-emphasis flex justify-between p-4" key={attribute.id}>
      <div>
        <h3 className="text-sm font-semibold leading-none">{attribute.name}</h3>
        <p className="text-default inline-flex items-center gap-1 text-sm font-normal leading-none">
          {TypeToLabelMap[attribute.type]}
          {attribute.options?.length > 0 && (
            <>
              <span className="text-muted">•</span>
              <span>{t("number_of_options", { count: attribute.options.length })}</span>
            </>
          )}
          {attribute.isWeightsEnabled && (
            <>
              <span className="text-muted">•</span>
              <Badge>{t("attribute_weight_enabled")}</Badge>
            </>
          )}
        </p>
      </div>
      <div className="flex gap-4">
        {permissions.canEdit && <Switch checked={isEnabled} onCheckedChange={handleToggle} />}
        {(permissions.canEdit || permissions.canDelete) && (
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
              {permissions.canEdit && (
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    StartIcon="pencil"
                    href={`/settings/organizations/attributes/${attribute.id}/edit`}>
                    {t("edit")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
              {permissions.canDelete && (
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    StartIcon="trash-2"
                    color="destructive"
                    className="rounded-t-none"
                    onClick={() => setAttributeToDelete(attribute)}>
                    {t("delete")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </Dropdown>
        )}
      </div>
    </ul>
  );
}

function OrganizationAttributesPage({
  permissions,
}: {
  permissions: { canEdit: boolean; canDelete: boolean; canCreate: boolean };
}) {
  const { t } = useLocale();
  const { data, isLoading } = trpc.viewer.attributes.list.useQuery();
  const [attributeToDelete, setAttributeToDelete] = useState<AttributeItemProps>();
  if (isLoading) {
    return (
      <>
        <div className="border-subtle bg-default flex flex-col gap-4 rounded-lg border p-6">
          <ListSkeleton />
        </div>
      </>
    );
  }

  return (
    <LicenseRequired>
      <div className="border-subtle bg-default flex flex-col gap-4 rounded-lg border p-6">
        {data && data?.length > 0 ? (
          <>
            <h2 className="text-emphasis text-base font-semibold leading-none">{t("custom")}</h2>
            <li className="border-subtle bg-default divide-subtle flex flex-col divide-y rounded-lg border">
              {data?.map((attribute) => (
                <AttributeItem
                  setAttributeToDelete={setAttributeToDelete}
                  attribute={attribute}
                  permissions={{ canEdit: permissions.canEdit, canDelete: permissions.canDelete }}
                  key={attribute.id}
                />
              ))}
            </li>
            {permissions.canCreate && (
              <Button
                className="w-fit"
                StartIcon="plus"
                color="minimal"
                href="/settings/organizations/attributes/create">
                {t("add")}
              </Button>
            )}
          </>
        ) : (
          <div className="flex w-full flex-col items-center justify-center p-14">
            <div className="bg-emphasis text-emphasis flex h-16 w-16 items-center justify-center rounded-full p-2">
              <Icon name="tags" />
            </div>
            <h2 className="font-cal text-emphasis mt-6 text-xl font-semibold leading-none">
              {t("add_attributes")}
            </h2>

            <p className="text-emphasis mt-3 text-sm font-normal leading-none">
              {t("add_attributes_description")}
            </p>
            {permissions.canCreate && (
              <Button
                className="mt-8"
                StartIcon="plus"
                color="secondary"
                href="/settings/organizations/attributes/create">
                {t("new_attribute")}
              </Button>
            )}
          </div>
        )}
      </div>
      {attributeToDelete && (
        <DeleteAttributeModal
          attributeToDelete={attributeToDelete}
          setAttributeToDelete={setAttributeToDelete}
        />
      )}
    </LicenseRequired>
  );
}

export default OrganizationAttributesPage;
