import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Button } from "../src/components/ui/button";
import { Form } from "./Form";

export function NewScheduleButton({ name = "new-schedule" }: { name?: string }) {
  return (
    <div>
      <Dialog>
        <DialogTrigger asChild>
          <Button>New</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new schedule</DialogTitle>
            <Form />
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
