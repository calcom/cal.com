import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";

import type { HttpError } from "@calcom/lib/http-error";
import { Plus } from "@calcom/ui/components/icon";

import { Button } from "../src/components/ui/button";
import { Form } from "./Form";
import type { Schedule } from ".prisma/client";

// create mutation handler to be handled outside the component
// then passed in as a prop
// TODO: translations can be taken care of later

export function NewScheduleButton({
  name = "new-schedule",
  createMutation,
}: {
  name?: string;
  createMutation: (values: {
    onSucess: (schedule: Schedule) => void;
    onError: (err: HttpError) => void;
  }) => void;
}) {
  const form = useForm<{
    name: string;
  }>();
  const { register } = form;

  return (
    <div>
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" data-testid={name}>
            {Plus}
            New
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new schedule</DialogTitle>
            <Form
              form={form}
              handleSubmit={(values) => {
                createMutation(values);
              }}>
              <Label htmlFor="working-hours">Name</Label>
              <Input id="working-hours" placeholder="Working Hours" />
              <DialogFooter>
                <Button type="button" variant="outline" className="mr-2 border-none">
                  Close
                </Button>
                <Button type="submit">Continue</Button>
              </DialogFooter>
            </Form>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
