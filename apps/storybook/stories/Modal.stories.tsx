import { useState } from "react";
import { Info } from "react-feather";

import { Button } from "@calcom/ui/v2";
import { Dialog, DialogContent, DialogTrigger } from "@calcom/ui/v2/Dialog";
import { TextField } from "@calcom/ui/v2/form/fields";

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
        <TextField name="Label" />
        <TextField name="Label" />
        <TextField name="Label" />
        <TextField name="Label" />
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
