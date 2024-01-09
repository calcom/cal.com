import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import NoSSR from "@calcom/core/components/NoSSR";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, EmailField, Form, Meta, TextField, showToast } from "@calcom/ui";

import { getLayout } from "../../../../../settings/layouts/SettingsLayout";
import LicenseRequired from "../../../../common/components/LicenseRequired";

export const OrgAddPage = () => {
  return (
    <LicenseRequired>
      <Meta title="Add a new organization" description="and create a billing plan" borderInShellHeader />
      <NoSSR>
        <div className="border-subtle rounded-b-md border border-t-0 p-4">
          <OrgForm />
        </div>
      </NoSSR>
    </LicenseRequired>
  );
};

type FormValues = {
  subdomain: string;
  ownerEmail?: string;
  billingEmail: string;
  accountManagerEmail: string;
  seats: number;
  price: number;
};

const OrgForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const mutation = trpc.viewer.organizations.adminUpdate.useMutation({
    onSuccess: async () => {
      /* await Promise.all([
        
      ]); */
      showToast(t("org_has_been_processed"), "success");
      router.replace(`/settings/admin/organizations`);
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("org_error_processing"), "error");
    },
  });

  const form = useForm<FormValues>({
    defaultValues: {
      subdomain: "",
      ownerEmail: "",
      billingEmail: "",
      accountManagerEmail: "",
      seats: 30,
      price: 37,
    },
  });

  const onSubmit = () => {
    /* mutation.mutate({
      id: org.id,
      ...values,
    }); */
  };

  return (
    <Form form={form} className="max-w-screen-sm space-y-4" handleSubmit={onSubmit}>
      <TextField
        addOnSuffix=".cal.com"
        label="Subdomain"
        placeholder="acme"
        {...form.register("subdomain")}
      />
      <EmailField label="Owner Email" placeholder="owner@acme.com" {...form.register("ownerEmail")} />
      <small className="relative -top-2 block opacity-50">
        This needs to be the email the organization owner will sign into cal.com
      </small>

      <EmailField label="Billing Email" placeholder="billing@acme.com" {...form.register("billingEmail")} />
      <small className="relative -top-2 block opacity-50">
        Optional: The email they want to receive invoices to
      </small>

      <hr />

      <EmailField
        label="Account Manager"
        placeholder="manager@cal.com"
        {...form.register("accountManagerEmail")}
      />
      <small className="relative -top-2 block opacity-50">
        The cal.com account manager that helps set up the organization
      </small>

      <TextField type="number" label="Seats" placeholder="30" {...form.register("seats")} />

      <TextField
        addOnSuffix="$"
        type="number"
        label="Price per seat"
        placeholder="37"
        {...form.register("price")}
      />

      {/*  TODO: Create user, create Stripe subscription, send email invite, */}
      <Button type="submit" color="primary" loading={mutation.isLoading}>
        {t("create")}
      </Button>
      <small className="relative -top-2 block opacity-50">
        Creating an Organization will send an email with billing information to the owner
      </small>
    </Form>
  );
};

OrgAddPage.getLayout = getLayout;
