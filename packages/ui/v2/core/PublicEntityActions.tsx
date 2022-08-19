/**
 * Any public facing Entity like EventType or Routing Form would have these common actions
 * - Hide
 * - Preview
 * - Copy Link
 * - Embed Link
 * - Delete
 * 	- Delete with confirmation
 */
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Icon } from "@calcom/ui";
import ConfirmationDialogContent from "@calcom/ui/ConfirmationDialogContent";
import { Button, ButtonGroup, Switch, Tooltip, Dialog } from "@calcom/ui/v2";

export default function PublicEntityActions({
  toggleAction,
  previewAction,
  downloadAction,
  deleteAction,
  embedAction,
  saveAction,
}: {
  toggleAction: {
    label: string;
    mutation: any;
    value: boolean;
    onAction: (boolean) => void;
  };
  previewAction: {
    link: string;
  };
  downloadAction?: {
    label: string;
    link: string;
  };
  embedAction: {
    label: string;
    link: string;
  };
  deleteAction: {
    title: string;
    confirmationText: string;
    confirmationBtnText: string;
    mutation: any;
    onAction: () => void;
  };
  saveAction: {
    mutation: () => void;
  };
}) {
  const { t } = useLocale();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <div className="flex items-center justify-end">
      <div className="hidden items-center space-x-2 border-r-2 border-gray-300 pr-5 xl:flex">
        <Switch name="Hidden" checked={toggleAction.value} onCheckedChange={toggleAction.onAction} />
      </div>
      {/* TODO: Figure out why combined isnt working - works in storybook */}
      <ButtonGroup combined containerProps={{ className: "px-4 border-gray-300 hidden xl:block" }}>
        {/* We have to warp this in tooltip as it has a href which disabels the tooltip on buttons */}

        <Tooltip content={previewAction.label}>
          <Button
            color="secondary"
            target="_blank"
            size="icon"
            href={previewAction.link}
            rel="noreferrer"
            StartIcon={Icon.FiExternalLink}
            combined
          />
        </Tooltip>

        <Button
          color="secondary"
          size="icon"
          StartIcon={Icon.FiLink}
          combined
          tooltip={t("copy_link")}
          onClick={() => {
            navigator.clipboard.writeText(previewAction.link);
            showToast("Link copied!", "success");
          }}
        />

        <Button color="secondary" size="icon" StartIcon={Icon.FiCode} combined tooltip={embedAction.label} />

        {downloadAction ? (
          <Tooltip content={downloadAction.label}>
            <Button
              href={downloadAction.link}
              color="secondary"
              size="icon"
              StartIcon={Icon.FiDownload}
              combined
            />
          </Tooltip>
        ) : null}
        <Button
          color="secondary"
          size="icon"
          tooltip={deleteAction.label}
          StartIcon={Icon.FiTrash}
          combined
          onClick={() => setDeleteDialogOpen(true)}
        />
      </ButtonGroup>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ConfirmationDialogContent
          isLoading={deleteAction.mutation.isLoading}
          variety="danger"
          title={deleteAction.title}
          confirmBtnText={deleteAction.confirmationBtnText}
          onConfirm={deleteAction.onAction}>
          {deleteAction.confirmationText}
        </ConfirmationDialogContent>
      </Dialog>

      <div className="border-l-2 border-gray-300" />
      <Button className="ml-4" type="submit" loading={saveAction.mutation.isLoading}>
        {t("save")}
      </Button>
    </div>
  );
}
