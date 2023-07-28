import { shallow } from "zustand/shallow";

import { SheetClose, Button } from "@calcom/ui";
import { Pencil } from "@calcom/ui/components/icon";

import { useEditMode } from "./store";

export function SheetFooterControls() {
  const [editMode, setEditMode] = useEditMode((state) => [state.editMode, state.setEditMode], shallow);
  return (
    <>
      {editMode ? (
        <>
          <Button
            color="secondary"
            className="justify-center md:w-1/5"
            onClick={() => {
              setEditMode(false);
            }}>
            Cancel
          </Button>
          <Button type="submit" className="w-full justify-center">
            Update
          </Button>
        </>
      ) : (
        <>
          <SheetClose asChild>
            <Button color="secondary" className="justify-center md:w-1/5">
              Close
            </Button>
          </SheetClose>
          <Button
            onClick={() => {
              setEditMode(true);
            }}
            className="w-full justify-center gap-2" // Add a gap cause us adding justify-center overrides the default gap
            variant="icon"
            StartIcon={Pencil}>
            Edit
          </Button>
        </>
      )}
    </>
  );
}
