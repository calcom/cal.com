import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { Controller, useFormContext } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon, TextField, Tooltip, showToast } from "@calcom/ui";

export const SingleUseLinksController = ({
  team,
  bookerUrl,
  disabled,
}: Pick<EventTypeSetupProps["eventType"], "team" | "bookerUrl"> & { disabled: boolean }) => {
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const [animateRef] = useAutoAnimate<HTMLUListElement>();
  return (
    <Controller
      name="singleUseLinks"
      control={formMethods.control}
      render={({ field: { value, onChange } }) => {
        if (!value) {
          value = [];
        }
        const addSingleUseLink = () => {
          const newSingleUseLink = generateHashedLink(formMethods.getValues("users")[0]?.id ?? team?.id);
          if (!value) value = [];
          value.push(newSingleUseLink);
          onChange(value);
        };

        const removeSingleUseLink = (index: number) => {
          if (!value) value = [];
          value.splice(index, 1);
          onChange(value);
        };

        return (
          <ul ref={animateRef}>
            {value &&
              value.map((val, key) => {
                const singleUseURL = `${bookerUrl}/d/${val}/${formMethods.getValues("slug")}`;
                return (
                  <li data-testid="add-single-use-link" className="mb-4 flex items-center" key={val}>
                    <TextField
                      containerClassName="w-full"
                      disabled
                      labelSrOnly
                      type="text"
                      defaultValue={singleUseURL}
                      addOnSuffix={
                        <Tooltip content={t("copy_to_clipboard")}>
                          <Button
                            color="minimal"
                            size="sm"
                            type="button"
                            className="hover:stroke-3 hover:text-emphasis min-w-fit !py-0 px-0 hover:bg-transparent"
                            aria-label="copy link"
                            onClick={() => {
                              navigator.clipboard.writeText(singleUseURL);
                              showToast(t("single_use_link_copied"), "success");
                            }}>
                            <Icon name="copy" className="ml-1 h-4 w-4" />
                          </Button>
                        </Tooltip>
                      }
                    />
                    {value && value.length > 1 && (
                      <Button
                        data-testid={`remove-single-use-link-${key}`}
                        variant="icon"
                        StartIcon="trash-2"
                        color="destructive"
                        className="ml-2 border-none"
                        onClick={() => removeSingleUseLink(key)}
                      />
                    )}
                  </li>
                );
              })}
            {!disabled && (
              <Button
                color="minimal"
                StartIcon="plus"
                onClick={addSingleUseLink}
                data-testid="add-single-use-link-button">
                {t("add_a_single_use_link")}
              </Button>
            )}
          </ul>
        );
      }}
    />
  );
};
