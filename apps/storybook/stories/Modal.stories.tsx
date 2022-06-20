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
      <DialogContent
        title="Header"
        description="Optional Description"
        type="creation"
        actionText="Create"
        actionOnClick={() => console.log("Action Clicked")}>
        <TextField name="Label" className="h-9 "></TextField>
        <TextField name="Label" className="h-9 "></TextField>
        <TextField name="Label" className="h-9 "></TextField>
        <TextField name="Label" className="h-9 "></TextField>
      </DialogContent>
    </Dialog>
  );
};
