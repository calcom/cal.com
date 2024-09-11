import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SheetClose, Button } from "@calcom/ui";

import { useEditMode } from "./store";

function EditModeFooter() {
  const { t } = useLocale();
  const setEditMode = useEditMode((state) => state.setEditMode);
  const isPending = useEditMode((state) => state.mutationLoading);

  return (
    <>
      <Button
        color="secondary"
        type="button"
        onClick={() => {
          setEditMode(false);
        }}>
        {t("cancel")}
      </Button>

      <Button type="submit" className="w-fit" form="edit-user-form" loading={isPending}>
        {t("update")}
      </Button>
    </>
  );
}

function MoreInfoFooter() {
  const { t } = useLocale();
  const setEditMode = useEditMode((state) => state.setEditMode);

  return (
    <>
      <SheetClose asChild>
        <Button color="secondary" type="button" className="justify-center">
          {t("close")}
        </Button>
      </SheetClose>
      <Button
        type="button"
        onClick={() => {
          setEditMode(true);
        }}
        key="EDIT_BUTTON"
        StartIcon="pencil">
        {t("edit")}
      </Button>
    </>
  );
}

export function SheetFooterControls() {
  const editMode = useEditMode((state) => state.editMode);
  return <>{editMode ? <EditModeFooter /> : <MoreInfoFooter />}</>;
}
