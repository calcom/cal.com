import { zodResolver } from "@hookform/resolvers/zod";
import { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EventLocationType, getEventLocationType } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  showToast,
  Dialog,
  DialogContent,
  Form,
  TextField,
  DialogFooter,
  Button,
  DialogClose,
} from "@calcom/ui";
import { FiAlertCircle } from "@calcom/ui/components/icon";

type LocationTypeSetLinkDialogFormProps = {
  link?: string;
  type: EventLocationType["type"];
};

export function AppSetDefaultLinkDailog({
  locationType,
  setLocationType,
}: {
  locationType: EventLocationType & { slug: string };
  setLocationType: Dispatch<SetStateAction<(EventLocationType & { slug: string }) | undefined>>;
}) {
  const utils = trpc.useContext();

  const { t } = useLocale();
  const eventLocationTypeOptions = getEventLocationType(locationType.type);

  const form = useForm<LocationTypeSetLinkDialogFormProps>({
    resolver: zodResolver(
      z.object({ link: z.string().regex(new RegExp(eventLocationTypeOptions?.urlRegExp ?? "")) })
    ),
  });

  const updateDefaultAppMutation = trpc.viewer.updateUserDefaultConferencingApp.useMutation({
    onSuccess: () => {
      showToast("Default app updated successfully", "success");
      utils.viewer.getUsersDefaultConferencingApp.invalidate();
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
        Icon={FiAlertCircle}>
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

            <DialogFooter>
              <Button color="primary" type="submit">
                {t("save")}
              </Button>
              <DialogClose />
            </DialogFooter>
          </>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
