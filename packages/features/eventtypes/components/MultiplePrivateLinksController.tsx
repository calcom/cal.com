import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Controller, useFormContext } from "react-hook-form";

import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";

export const MultiplePrivateLinksController = ({
  team,
  bookerUrl,
}: Pick<EventTypeSetupProps["eventType"], "team" | "bookerUrl">) => {
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const [animateRef] = useAutoAnimate<HTMLUListElement>();
  return (
    <Controller
      name="multiplePrivateLinks"
      control={formMethods.control}
      render={({ field: { value, onChange } }) => {
        if (!value) {
          value = [];
        }
        const addPrivateLink = () => {
          const newPrivateLink = generateHashedLink(formMethods.getValues("users")[0]?.id ?? team?.id);
          if (!value) value = [];
          value.push(newPrivateLink);
          onChange(value);
        };

        const removePrivateLink = (index: number) => {
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
                      data-testid={`generated-hash-url-${key}`}
                      labelSrOnly
                      type="text"
                      defaultValue={singleUseURL}
                      addOnSuffix={
                        <Tooltip content={t("copy_to_clipboard")}>
                          <Button
                            color="minimal"
                            size="sm"
                            type="button"
                            aria-label="copy link"
                            onClick={() => {
                              navigator.clipboard.writeText(singleUseURL);
                              showToast(t("multiple_private_link_copied"), "success");
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
                        onClick={() => removePrivateLink(key)}
                      />
                    )}
                  </li>
                );
              })}
            <Button
              color="minimal"
              StartIcon="plus"
              onClick={addPrivateLink}
              data-testid="add-single-use-link-button">
              {t("add_a_multiple_private_link")}
            </Button>
          </ul>
        );
      }}
    />
  );
};
