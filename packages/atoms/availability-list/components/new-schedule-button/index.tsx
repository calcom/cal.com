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
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";

import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";

import { Button } from "../../../src/components/ui/button";
import { Form } from "../form";

type NewScheduleButtonProps = {
  name?: string;
  fromEventType?: boolean;
};

export function NewScheduleButton({ name = "new-schedule", fromEventType }: NewScheduleButtonProps) {
  const form = useForm<{
    name: string;
  }>();
  const utils = trpc.useContext();

  const createMutation = trpc.viewer.availability.schedule.create.useMutation({
    onSuccess: (schedule) => {
      // router.push and then add success toast
      // await router.push(`/availability/${schedule.id}${fromEventType ? "?fromEventType=true" : ""}`);
      // showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
      utils.viewer.availability.list.setData(undefined, (data) => {
        const newSchedule = { ...schedule, isDefault: false, availability: [] };
        if (!data)
          return {
            schedules: [newSchedule],
          };
        return {
          ...data,
          schedules: [...data.schedules, newSchedule],
        };
      });
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        // show error toast
        // showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not able to create this schedule`;
        // show error toast
        // showToast(message, "error");
      }
    },
  });

  return (
    <div>
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" data-testid={name}>
            <Plus />
            New
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new schedule</DialogTitle>
            <Form
              form={form}
              handleSubmit={(values) => {
                createMutation.mutate(values);
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
