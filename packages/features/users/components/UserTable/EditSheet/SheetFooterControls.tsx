import { shallow } from "zustand/shallow";

import { SheetClose, Button } from "@calcom/ui";
import { Pencil } from "@calcom/ui/components/icon";

import { useEditMode } from "./store";

export function SheetFooterControls() {
  const [editMode, setEditMode] = useEditMode((state) => [state.editMode, state.setEditMode], shallow);
  const isLoading = useEditMode((state) => state.mutationLoading);
  return (
    <>
      {editMode ? (
        <>
          <Button
            color="secondary"
            type="button"
            className="justify-center md:w-1/5"
            onClick={() => {
              setEditMode(false);
            }}>
            Cancel
          </Button>

          <Button type="submit" className="w-full justify-center" form="edit-user-form" loading={isLoading}>
            Update
          </Button>
        </>
      ) : (
        <>
          <SheetClose asChild>
            <Button color="secondary" type="button" className="justify-center md:w-1/5">
              Close
            </Button>
          </SheetClose>
          {/* 
            Weird that we need to provide a key to tell react that these are different buttons.
            When it gets mounted it automatically submits without the key to tell it that it's a different button.
          */}
          <Button
            type="button"
            onClick={() => {
              setEditMode(true);
            }}
            className="w-full justify-center gap-2" // Add a gap cause us adding justify-center overrides the default gap
            variant="icon"
            key="EDIT_BUTTON"
            StartIcon={Pencil}>
            Edit
          </Button>
        </>
      )}
    </>
  );
}
