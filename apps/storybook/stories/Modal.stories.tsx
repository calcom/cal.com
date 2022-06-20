import { Button } from "@calcom/ui";
import { Dialog, DialogContent, DialogFooter, DialogClose, DialogTrigger } from "@calcom/ui/Dialog";
import { TextField } from "@calcom/ui/form/fields";

export default {
  title: "pattern/Modal",
  component: Dialog,
};

export const Creation = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Modal</Button>
      </DialogTrigger>
      <DialogContent title="Header" description="Optional Description" type="creation">
        <TextField name="Label" className="h-9 "></TextField>
        <TextField name="Label" className="h-9 "></TextField>
        <TextField name="Label" className="h-9 "></TextField>
        <TextField name="Label" className="h-9 "></TextField>
        <DialogFooter>
          <DialogClose asChild>
            <Button color="minimal">Close</Button>
          </DialogClose>
          <Button color="primary">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
