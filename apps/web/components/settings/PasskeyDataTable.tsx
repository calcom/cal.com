import { zodResolver } from "@hookform/resolvers/zod";
import { DateTime } from "luxon";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DropdownActions,
  Label,
  showToast,
  Table,
  Form,
  Input,
} from "@calcom/ui";

type Passkeys = RouterOutputs["viewer"]["passkey"]["find"];
type props = {
  passkeys: Passkeys;
};
const ZUpdatePasskeyFormSchema = z.object({
  passkeyName: z.string().min(3),
});

type TUpdatePasskeyFormSchema = z.infer<typeof ZUpdatePasskeyFormSchema>;
const { Cell, ColumnTitle, Header, Row } = Table;

function PasskeyDataTable({ passkeys }: props) {
  const [showUpdatePasskeyModel, setShowUpdatePasskeyModel] = useState(false);
  const [selectedPasskeyId, setSelectedPasskeyId] = useState<string | null>(null);
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm<TUpdatePasskeyFormSchema>({
    resolver: zodResolver(ZUpdatePasskeyFormSchema),
    defaultValues: {
      passkeyName: "",
    },
  });
  const { mutateAsync: deletePasskey } = trpc.viewer.passkey.delete.useMutation({
    onSuccess: () => {
      utils.viewer.passkey.find.invalidate();
      showToast(t("successfully_deleted_passkey"), "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const { mutateAsync: updatePasskey, isPending } = trpc.viewer.passkey.update.useMutation({
    onSuccess: () => {
      utils.viewer.passkey.find.invalidate();
      showToast(t("successfully_updated_passkey"), "success");
      setShowUpdatePasskeyModel(false);
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });
  return (
    <div>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">Name</ColumnTitle>
          <ColumnTitle>Created</ColumnTitle>
          <ColumnTitle>Last used</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            <span className="sr-only">Edit</span>
          </ColumnTitle>
        </Header>
        <tbody className="divide-subtle divide-y rounded-md">
          {passkeys.map((passkey) => (
            <Row key={passkey.id}>
              <Cell widthClassNames="w-auto">
                <div className="text-subtle font-medium">{passkey.name}</div>
              </Cell>
              <Cell widthClassNames="w-auto">
                <div className="text-subtle font-medium">{dayjs(passkey.createdAt).fromNow()}</div>
              </Cell>
              <Cell widthClassNames="w-auto">
                <div className="text-subtle font-medium">
                  {passkey.lastUsedAt ? DateTime.fromJSDate(passkey.lastUsedAt).toRelative() : "Not yet"}
                </div>
              </Cell>
              <Cell widthClassNames="w-auto">
                <div className="flex w-full justify-end">
                  <DropdownActions
                    actions={[
                      {
                        id: "edit",
                        label: "Edit",
                        onClick: () => {
                          setSelectedPasskeyId(passkey.id);
                          setShowUpdatePasskeyModel(true);
                        },
                        icon: "pencil",
                      },
                      {
                        id: "delete",
                        label: "Delete",
                        color: "destructive",
                        onClick: async () => {
                          await deletePasskey({ passkeyId: passkey.id });
                        },
                        icon: "trash",
                      },
                    ]}
                  />
                </div>
              </Cell>
            </Row>
          ))}
        </tbody>
      </Table>
      {showUpdatePasskeyModel && selectedPasskeyId && (
        <Dialog open={true} onOpenChange={setShowUpdatePasskeyModel}>
          <DialogContent title={t("update_passkey_name")} type="creation">
            <Form
              form={form}
              handleSubmit={async (value) => {
                await updatePasskey({
                  name: value.passkeyName,
                  passkeyId: selectedPasskeyId,
                });
              }}>
              <Label htmlFor="passkey">{t("passkey_name")}</Label>
              <Controller
                name="passkeyName"
                control={form.control}
                render={({ field }) => <Input {...field} />}
              />
              <DialogFooter>
                <DialogClose />
                <Button type="submit" loading={isPending}>
                  {t("update")}
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default PasskeyDataTable;
