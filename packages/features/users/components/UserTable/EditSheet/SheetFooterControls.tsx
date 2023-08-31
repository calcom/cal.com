import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SheetClose, Button } from "@calcom/ui";
import { Pencil } from "@calcom/ui/components/icon";

import { useEditMode } from "./store";

function EditModeFooter() {
  const { t } = useLocale();
  const setEditMode = useEditMode((state) => state.setEditMode);
  const isLoading = useEditMode((state) => state.mutationLoading);

  return (
    <>
      <Button
        color="secondary"
        type="button"
        className="justify-center md:w-1/5"
        onClick={() => {
          setEditMode(false);
        }}>
        {t("cancel")}
      </Button>

      <Button type="submit" className="w-full justify-center" form="edit-user-form" loading={isLoading}>
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
        <Button color="secondary" type="button" className="w-full justify-center lg:w-1/5">
          {t("close")}
        </Button>
      </SheetClose>
      <Button
        type="button"
        onClick={() => {
          setEditMode(true);
        }}
        className="w-full justify-center gap-2"
        variant="icon"
        key="EDIT_BUTTON"
        StartIcon={Pencil}>
        {t("edit")}
      </Button>
    </>
  );
}

export function SheetFooterControls() {
  const editMode = useEditMode((state) => state.editMode);
  return <>{editMode ? <EditModeFooter /> : <MoreInfoFooter />}</>;
}
