import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { SheetClose } from "@calcom/ui/components/sheet";

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
        className="justify-center"
        onClick={() => {
          setEditMode(false);
        }}>
        {t("cancel")}
      </Button>

      <Button type="submit" loading={isPending} className="justify-center">
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
        className="justify-center"
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
