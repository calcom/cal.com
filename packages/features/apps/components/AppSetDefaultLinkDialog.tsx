import { zodResolver } from "@hookform/resolvers/zod";
import type { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationType } from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
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

export type UpdateUsersDefaultConferencingAppParams = {
  appSlug: string;
  appLink?: string;
  onSuccessCallback: () => void;
  onErrorCallback: () => void;
};

type LocationTypeSetLinkDialogFormProps = {
  link?: string;
  type: EventLocationType["type"];
};

export function AppSetDefaultLinkDialog({
  locationType,
  setLocationType,
  onSuccess,
  handleUpdateUserDefaultConferencingApp,
}: {
  locationType: EventLocationType & { slug: string };
  setLocationType: Dispatch<SetStateAction<(EventLocationType & { slug: string }) | undefined>>;
  onSuccess: () => void;
  handleUpdateUserDefaultConferencingApp: (params: UpdateUsersDefaultConferencingAppParams) => void;
}) {
  const { t } = useLocale();
  const eventLocationTypeOptions = getEventLocationType(locationType.type);

  const form = useForm<LocationTypeSetLinkDialogFormProps>({
    resolver: zodResolver(
      z.object({ link: z.string().regex(new RegExp(eventLocationTypeOptions?.urlRegExp ?? "")) })
    ),
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
            handleUpdateUserDefaultConferencingApp({
              appSlug: locationType.slug,
              appLink: values.link,
              onSuccessCallback: () => {
                onSuccess();
              },
              onErrorCallback: () => {
                showToast(`Invalid App Link Format`, "error");
              },
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
