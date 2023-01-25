import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Dialog, DialogContent, DialogHeader, Form } from "@calcom/ui";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui";
import { FiZap } from "@calcom/ui/components/icon";

type FormValues = {
  name?: string;
  activeOn: Option[];
};

export const CreateWorkflowDialog = () => {
  const formSchema = z.object({
    name: z.string(),
    activeOn: z.object({ value: z.string(), label: z.string() }).array(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  return (
    <Dialog name="new">
      <DialogContent type="creation">
        <>
          <div className="flex ">
            <FiZap className="mt-1 mr-2.5" />
            <div className="text-base font-medium ">Workflow in Cal.com</div>
          </div>
          <Form
            form={form}
            handleSubmit={(values) => {
              console.log("Create Workflow");
            }}
          />
        </>
      </DialogContent>
    </Dialog>
  );
};
