import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RoutingFormWithResponseCount } from "@calcom/routing-forms/types/types";
import { Button } from "@calcom/ui/components/button";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

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
      <div className="flex gap-2">
        <Button color="secondary">{t("preview")}</Button>
        <Button color="secondary" variant="icon" StartIcon="settings" />
        <Button color="secondary" variant="icon" StartIcon="ellipsis" />
        <Button variant="icon">{t("save")}</Button>
      </div>
    </div>
  );
}
