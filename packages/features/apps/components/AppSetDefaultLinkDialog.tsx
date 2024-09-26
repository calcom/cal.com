import { zodResolver } from "@hookform/resolvers/zod";
import type { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Form,
  showToast,
  TextField,
} from "@calcom/ui";

type LocationTypeSetLinkDialogFormProps = {
  link?: string;
  type: EventLocationType["type"];
};

export function AppSetDefaultLinkDialog({
  locationType,
  setLocationType,
  onSuccess,
}: {
  locationType: EventLocationType & { slug: string };
  setLocationType: Dispatch<SetStateAction<(EventLocationType & { slug: string }) | undefined>>;
  onSuccess: () => void;
}) {
  const { t } = useLocale();
  const eventLocationTypeOptions = getEventLocationType(locationType.type);

  const form = useForm<LocationTypeSetLinkDialogFormProps>({
    resolver: zodResolver(
      z.object({ link: z.string().regex(new RegExp(eventLocationTypeOptions?.urlRegExp ?? "")) })
    ),
  });

  const updateDefaultAppMutation = trpc.viewer.updateUserDefaultConferencingApp.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: () => {
      showToast(`Invalid App Link Format`, "error");
    },
  });

  return (
    <Dialog open={!!locationType} onOpenChange={() => setLocationType(undefined)}>
      <DialogContent
        title={t("default_app_link_title")}
        description={t("default_app_link_description")}
        type="creation"
        Icon="circle-alert">
        <Form
          form={form}
          handleSubmit={(values) => {
            updateDefaultAppMutation.mutate({
              appSlug: locationType.slug,
              appLink: values.link,
            });
            setLocationType(undefined);
          }}>
          <>
            <TextField
              type="text"
              required
              {...form.register("link")}
              placeholder={locationType.organizerInputPlaceholder ?? ""}
              label={locationType.label ?? ""}
            />

            <DialogFooter showDivider className="mt-8">
              <DialogClose />
              <Button color="primary" type="submit">
                {t("save")}
              </Button>
            </DialogFooter>
          </>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
