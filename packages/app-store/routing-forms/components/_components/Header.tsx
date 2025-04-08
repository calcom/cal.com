"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RoutingFormWithResponseCount } from "@calcom/routing-forms/types/types";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DropdownMenuSeparator } from "@calcom/ui/components/dropdown";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { FormAction, FormActionsDropdown } from "../FormActions";

const Actions = ({ form }: { form: RoutingFormWithResponseCount }) => {
  const { t } = useLocale();
  const mutation = trpc.viewer.appRoutingForms.formMutation.useMutation();

  return (
    <div className="flex items-center">
      {/* <div className="hidden items-center sm:inline-flex">
        <FormAction className="self-center" data-testid="toggle-form" action="toggle" routingForm={form} />
        <VerticalDivider />
      </div> */}
      <div className="hidden items-center gap-1 md:inline-flex">
        <Tooltip sideOffset={4} content={t("preview")} side="bottom">
          <FormAction
            routingForm={form}
            color="secondary"
            target="_blank"
            variant="icon"
            type="button"
            rel="noreferrer"
            action="preview">
            {t("preview")}
          </FormAction>
        </Tooltip>
        <FormAction
          routingForm={form}
          action="copyLink"
          color="secondary"
          variant="icon"
          type="button"
          StartIcon="link"
          tooltip={t("copy_link_to_form")}
          tooltipSide="bottom"
        />
        <Tooltip sideOffset={4} content={t("download_responses")} side="bottom">
          <FormAction
            data-testid="download-responses"
            routingForm={form}
            action="download"
            color="secondary"
            variant="icon"
            type="button"
            StartIcon="download"
          />
        </Tooltip>
        <FormAction
          routingForm={form}
          action="embed"
          color="secondary"
          variant="icon"
          StartIcon="code"
          tooltip={t("embed")}
          tooltipSide="bottom"
        />
        <DropdownMenuSeparator />
        <FormAction
          routingForm={form}
          action="_delete"
          className="mx-1"
          variant="icon"
          StartIcon="trash"
          color="secondary"
          type="button"
          tooltip={t("delete")}
          tooltipSide="bottom"
        />
      </div>

      <div className="flex gap-1 md:hidden">
        <FormActionsDropdown>
          <FormAction
            routingForm={form}
            color="minimal"
            target="_blank"
            type="button"
            rel="noreferrer"
            action="preview"
            StartIcon="external-link">
            {t("preview")}
          </FormAction>
          <FormAction
            action="copyLink"
            className="w-full"
            routingForm={form}
            color="minimal"
            type="button"
            StartIcon="link">
            {t("copy_link_to_form")}
          </FormAction>
          <FormAction
            action="download"
            routingForm={form}
            className="w-full"
            color="minimal"
            type="button"
            StartIcon="download">
            {t("download_responses")}
          </FormAction>
          <FormAction
            action="embed"
            routingForm={form}
            color="minimal"
            type="button"
            className="w-full"
            StartIcon="code">
            {t("embed")}
          </FormAction>
          <DropdownMenuSeparator className="hidden sm:block" />
          <FormAction
            action="_delete"
            routingForm={form}
            className="w-full"
            type="button"
            color="destructive"
            StartIcon="trash">
            {t("delete")}
          </FormAction>
          <div className="block sm:hidden">
            <DropdownMenuSeparator />
            <FormAction
              data-testid="toggle-form"
              action="toggle"
              routingForm={form}
              label="Disable Form"
              extraClassNames="hover:bg-subtle cursor-pointer rounded-[5px] pr-4 transition"
            />
          </div>
        </FormActionsDropdown>
      </div>
      <Button data-testid="update-form" loading={mutation.isPending} type="submit" color="primary">
        {t("save")}
      </Button>
    </div>
  );
};

export function Header({ routingForm }: { routingForm: RoutingFormWithResponseCount }) {
  const { t } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(routingForm.name);
  const form = useFormContext<RoutingFormWithResponseCount>();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleSubmit = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      form.setValue("name", title);
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      form.setValue("name", routingForm.name);
      setIsEditing(false);
    }
  };

  const watchedName = form.watch("name");

  return (
    <div className="bg-default border-muted flex items-center justify-between border-b px-4 py-3">
      {/* Left */}
      <div className="flex items-center gap-2">
        <Button color="minimal" variant="icon" StartIcon="arrow-left" />
        <div className="flex min-w-0 items-center">
          <span className="text-subtle min-w-content text-sm font-semibold leading-none">
            {t("routing_form")}
          </span>
          <span className="text-subtle mx-1 text-sm font-semibold leading-none">/</span>
          {isEditing ? (
            <input
              {...form.register("name")}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleTitleSubmit}
              className="text-default h-auto w-full whitespace-nowrap border-none p-0 text-sm font-semibold leading-none focus:ring-0"
              autoFocus
            />
          ) : (
            <div className="group flex items-center gap-1">
              <span
                className="text-default hover:bg-muted min-w-[100px] cursor-pointer truncate whitespace-nowrap rounded px-1 text-sm font-semibold leading-none"
                onClick={() => setIsEditing(true)}>
                {watchedName}
              </span>
              <Icon name="pencil" className="text-subtle group-hover:text-default h-3 w-3" />
            </div>
          )}
        </div>
      </div>

      {/* Segment */}
      <ToggleGroup
        defaultValue="forms"
        onValueChange={(value) => {
          if (!value) return;
          console.log("Selected:", value);
        }}
        options={[
          { value: "forms", label: t("forms"), iconLeft: <Icon name="menu" className="h-3 w-3" /> },
          {
            value: "responses",
            label: t("responses"),
            iconLeft: <Icon name="waypoints" className="h-3 w-3" />,
          },
        ]}
      />

      {/* Actions */}
      {/* <div className="flex gap-2">
        <Button color="secondary">{t("preview")}</Button>
        <Button color="secondary" variant="icon" StartIcon="settings" />
        <Button color="secondary" variant="icon" StartIcon="ellipsis" />
        <Button variant="icon">{t("save")}</Button>
      </div> */}
      <Actions form={routingForm} />
    </div>
  );
}
