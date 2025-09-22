import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ButtonOrLink,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { Switch } from "@calid/features/ui/components/switch";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import type { UseFormReturn } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { showToast } from "@calcom/ui/components/toast";

interface EventTypeActionsProps {
  form: UseFormReturn<FormValues>;
  eventTypesLockedByOrg?: boolean;
  permalink: string;
  hasPermsToDelete: boolean;
  isUpdatePending: boolean;
  handleSubmit: (values: FormValues) => Promise<void>;
  onDeleteClick: () => void;
}

export const EventTypeActions = ({
  form,
  eventTypesLockedByOrg,
  permalink,
  hasPermsToDelete,
  isUpdatePending,
  handleSubmit,
  onDeleteClick,
}: EventTypeActionsProps) => {
  const { t } = useLocale();
  console.log(form.watch("hidden"));

  return (
    <div className="mr-2 flex items-center justify-end space-x-4">
      {/* Hidden toggle */}
      {(() => {
        try {
          const metadata = form?.getValues("metadata");
          return !metadata?.managedEventConfig;
        } catch (error) {
          return true;
        }
      })() && (
        <div className="flex items-center space-x-2">
          <Switch
            id="hiddenSwitch"
            disabled={eventTypesLockedByOrg}
            tooltip={form.watch("hidden") ? t("show_eventtype_on_profile") : t("hide_from_profile")}
            checked={(() => {
              try {
                const hidden = form?.watch("hidden");
                return !hidden;
              } catch (error) {
                return true;
              }
            })()}
            onCheckedChange={(e) => {
              try {
                form?.setValue("hidden", !e, { shouldDirty: true });
              } catch (error) {
                console.error("EventTypeActions - Error setting hidden value:", error);
              }
            }}
          />
        </div>
      )}

      {/* Action buttons */}
      <ButtonGroup>
        <Tooltip content={t("preview")} sideOffset={4}>
          <Button
            color="secondary"
            variant="icon"
            href={permalink}
            target="_blank"
            rel="noreferrer"
            StartIcon="external-link"
          />
        </Tooltip>

        <Button
          color="secondary"
          variant="icon"
          StartIcon="link"
          tooltip={t("copy_link")}
          onClick={() => {
            navigator.clipboard.writeText(permalink);
            showToast("Link copied!", "success");
          }}
        />

        <Button
          color="destructive"
          variant="icon"
          StartIcon="trash"
          tooltip={t("delete")}
          disabled={!hasPermsToDelete}
          onClick={onDeleteClick}
        />
      </ButtonGroup>

      {/* Mobile dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="lg:hidden" StartIcon="ellipsis" variant="icon" color="secondary" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <ButtonOrLink target="_blank" type="button" href={permalink} className="flex w-full items-center">
              <Icon name="external-link" className="mr-2 h-4 w-4" />
              {t("preview")}
            </ButtonOrLink>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ButtonOrLink
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(permalink);
                showToast("Link copied!", "success");
              }}
              className="flex w-full items-center">
              <Icon name="link" className="mr-2 h-4 w-4" />
              {t("copy_link")}
            </ButtonOrLink>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!hasPermsToDelete}>
            <ButtonOrLink
              type="button"
              onClick={onDeleteClick}
              className="text-destructive flex w-full items-center">
              <Icon name="trash" className="mr-2 h-4 w-4" />
              {t("delete")}
            </ButtonOrLink>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        loading={isUpdatePending}
        onClick={() => handleSubmit(form.getValues())}
        disabled={(() => {
          try {
            const isDirty = form?.formState?.isDirty;
            return !isDirty || isUpdatePending;
          } catch (error) {
            return true;
          }
        })()}
        form="event-type-form">
        {t("save")}
      </Button>
    </div>
  );
};
