import crypto from "crypto";
import { GetServerSidePropsContext } from "next";
import { signOut } from "next-auth/react";
import { Trans } from "next-i18next";
import { useRouter } from "next/router";
import { useRef, useState, BaseSyntheticEvent, FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";

import { ErrorCode, getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Icon } from "@calcom/ui";
import { Alert } from "@calcom/ui/Alert";
import Avatar from "@calcom/ui/v2/core/Avatar";
import { Button } from "@calcom/ui/v2/core/Button";
import { Dialog, DialogContent, DialogTrigger } from "@calcom/ui/v2/core/Dialog";
import Meta from "@calcom/ui/v2/core/Meta";
import { Form, Label, TextField, PasswordField } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import showToast from "@calcom/ui/v2/core/notifications";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import TwoFactor from "@components/auth/TwoFactor";
import WebhookForm, { TWebhook } from "@components/v2/settings/webhook/WebhookForm";

const NewWebhookView = (props) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();
  //   const appId = props.app;
  const { data: webhooks } = trpc.useQuery(
    ["viewer.webhook.list", { eventTypeId: props.eventTypeId || undefined, appId: props.appId || undefined }],
    {
      suspense: true,
      enabled: router.isReady,
    }
  );

  const createWebhookMutation = trpc.useMutation("viewer.webhook.create", {
    onSuccess() {
      showToast("Webhook created", "success");
    },
    onError(error) {
      console.log(error);
    },
  });

  const subscriberUrlReserved = (subscriberUrl: string, id: string): boolean => {
    return !!webhooks?.find((webhook) => webhook.subscriberUrl === subscriberUrl && webhook.id !== id);
  };

  const onCreateWebhook = async (values) => {
    console.log("🚀 ~ file: new.tsx ~ line 57 ~ onCreateWebhook ~ values", values);
    if (subscriberUrlReserved(values.subscriberUrl, values.id)) {
      showToast(t("webhook_subscriber_url_reserved"), "error");
      return;
    }

    if (!values.payloadTemplate) {
      values.payloadTemplate = null;
    }

    // await utils.client.mutation("viewer.webhook.create", values);
    createWebhookMutation.mutate(values);
    await utils.invalidateQueries(["viewer.webhook.list"]);
    showToast(t("webhook_created_successfully"), "success");
  };

  return (
    <>
      <Meta title="add_webhook" description="add_webhook_description" backButton />

      <WebhookForm onSubmit={onCreateWebhook} />
    </>
  );
};

NewWebhookView.getLayout = getLayout;

export default NewWebhookView;
