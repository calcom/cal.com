import { useRouter } from "next/router";
import { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";

import { trpc } from "@calcom/trpc/react";
import { Button, Form, Icon, TextField } from "@calcom/ui";

type EnterpriseLicenseFormValues = {
  licenseKey: string;
};

const EnterpriseLicense = (props: {
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsEnabled: Dispatch<SetStateAction<boolean>>;
}) => {
  const router = useRouter();
  const mutation = trpc.viewer.auth.deploymentSetup.useMutation({
    onSuccess: () => {
      router.replace(`/auth/setup?step=4`);
    },
  });

  const formMethods = useForm<EnterpriseLicenseFormValues>({
    defaultValues: {
      licenseKey: "",
    },
  });

  const {
    register,
    formState: { isSubmitting },
  } = formMethods;

  const handleSubmit = ({ licenseKey }: EnterpriseLicenseFormValues) => {
    props.setIsLoading(true);
    mutation.mutate({ licenseKey });
  };

  return (
    <Form
      form={formMethods}
      handleSubmit={handleSubmit}
      id="wizard-step-3"
      name="wizard-step-3"
      className="space-y-4">
      <div>
        <Button
          className="w-full justify-center text-lg"
          EndIcon={Icon.FiExternalLink}
          href="https://console.cal.com"
          target="_blank">
          Purchase a License
        </Button>
        <div className="relative flex justify-center">
          <hr className="my-8 w-full border-[1.5px] border-gray-200" />
          <span className="absolute mt-[22px] bg-white px-3.5 text-sm">OR</span>
        </div>
        I already have a key:
        <TextField
          className="mt-1"
          placeholder="b6052119-1fee-42a6-90e3-55cjgjaaebb7"
          labelSrOnly={true}
          onChange={(e) => {
            props.setIsEnabled(e.target.value !== "");
            formMethods.setValue("licenseKey", e.target.value);
          }}
          id="licenseKey"
          name="licenseKey"
        />
      </div>
    </Form>
  );
};

export default EnterpriseLicense;
