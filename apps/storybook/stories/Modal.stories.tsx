import { useState } from "react";
import { Info } from "react-feather";

import { Button } from "@calcom/ui";
import { Dialog, DialogContent, DialogTrigger } from "@calcom/ui/Dialog";
import { TextField } from "@calcom/ui/form/fields";

export default {
  title: "pattern/Modal",
  component: Dialog,
};

export const Creation = () => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
      </DialogTrigger>
      <DialogContent
        title="Header"
        description="Optional Description"
        type="creation"
        actionText="Create"
        actionOnClick={() => setOpen(false)}>
        <TextField name="Label" className="h-9 "></TextField>
        <TextField name="Label" className="h-9 "></TextField>
        <TextField name="Label" className="h-9 "></TextField>
        <TextField name="Label" className="h-9 "></TextField>
      </DialogContent>
    </Dialog>
  );
};

export const Confirmation = () => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open Modal</Button>
      </DialogTrigger>
      <DialogContent
        title="Header"
        description="Optional Description"
        type="confirmation"
        actionText="Confirm"
        Icon={Info}
        actionOnClick={() => setOpen(false)}
      />
    </Dialog>
  );
};
