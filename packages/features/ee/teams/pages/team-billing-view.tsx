import { MembershipRole } from "@prisma/client";
import { useRouter } from "next/router";
import { Controller, useForm } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Form, showToast, Switch } from "@calcom/ui/v2/core";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const BillingView = () => {
  return (
    <>
      <Meta title="Team Billing" description="Manage billing for your team" />

      <section className={classNames("flex flex-col sm:flex-row", className)}>
        <div>
          <h2 className="font-medium">Billing</h2>
          <p>Billing details</p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pt-0 sm:pl-3">
          <p>Button</p>
        </div>
      </section>
      <hr className="border-neutral-200" />
    </>
  );
};

BillingView.getLayout = getLayout;

export default BillingView;
