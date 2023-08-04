import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { trpc } from "@calcom/trpc";
import { Meta, Form, Button, TextField } from "@calcom/ui";

type FormValues = {
  name?: string | null;
};

export const KYCVerificationView = () => {
  const teamForm = useForm<FormValues>();
  const userForm = useForm<FormValues>();

  // const mutation = trpc.viewer.kycVerification.verify.useMutation({
  //   onSuccess: async () => {
  //     showToast("Verification successful", "success");
  //   },
  //   onError: (error) => {
  //     showToast(`Veriification failed:${error.message}`, "error");
  //   },
  // });
  const { data, isLoading } = trpc.viewer.kycVerification.isVerified.useQuery();

  useEffect(() => {
    console.log("test");
    console.log(data);
  }, [isLoading]);

  return (
    <div>
      <Meta
        title="KYC Verification"
        description="Here you can verify users and teams. This verification is needed for sending sms/whatsapp messages to attendees."
      />
      <div>
        <div className="mb-2 font-medium">Verify Team</div>

        <Form
          form={teamForm}
          handleSubmit={(values) => {
            mutation.mutate({
              name: values.name,
              isTeam: true,
            });
          }}>
          <div className="flex space-x-2">
            <TextField
              {...teamForm.register("name")}
              label=""
              type="text"
              id="name"
              placeholder="team slug"
              className="-mt-2 "
              required
            />
            <Button type="submit ml-2">Verify</Button>
          </div>
        </Form>
      </div>
      <div>
        <div className="mb-2 mt-6 font-medium">Verify User</div>
        <Form
          form={userForm}
          handleSubmit={(values) => {
            mutation.mutate({
              name: values.name,
              isTeam: false,
            });
          }}>
          <div className="flex space-x-2">
            <TextField
              {...teamForm.register("name")}
              label=""
              type="text"
              id="name"
              placeholder="user name"
              className="-mt-2"
              required
            />
            <Button type="submit">Verify</Button>
          </div>
        </Form>
      </div>
    </div>
  );
};
