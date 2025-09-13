import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ButtonOrLink,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { Label } from "@calid/features/ui/components/label";
import { Switch } from "@calid/features/ui/components/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@calid/features/ui/components/tooltip";
import type { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { showToast } from "@calcom/ui/components/toast";

interface EventTypeActionsProps {
  form: UseFormReturn<any>;
  eventTypesLockedByOrg?: boolean;
  permalink: string;
  hasPermsToDelete: boolean;
  isUpdatePending: boolean;
  onDeleteClick: () => void;
}

export const EventTypeActions = ({
  form,
  eventTypesLockedByOrg,
  permalink,
  hasPermsToDelete,
  isUpdatePending,
  onDeleteClick,
}: EventTypeActionsProps) => {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-end space-x-4 mr-2">
      {/* Hidden toggle */}
      {!form.getValues("metadata")?.managedEventConfig && (
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Switch
                id="hiddenSwitch"
                disabled={eventTypesLockedByOrg}
                checked={!form.watch("hidden")}
                onCheckedChange={(e) => {
                  form.setValue("hidden", !e, { shouldDirty: true });
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {form.watch("hidden") ? t("show_eventtype_on_profile") : t("hide_from_profile")}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Action buttons */}
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              color="secondary"
              variant="icon"
              href={permalink}
              target="_blank"
              rel="noreferrer"
              StartIcon="external-link"
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("preview")}</TooltipContent>
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
        type="submit"
        loading={isUpdatePending}
        disabled={!form.formState.isDirty || isUpdatePending}
        form="event-type-form">
        {t("save")}
      </Button>
    </div>
  );
};
