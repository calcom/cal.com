import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc/react";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import showToast from "@calcom/ui/v2/core/notifications";

import { asStringOrThrow } from "@lib/asStringOrNull";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import WebhookForm, { WebhookFormSubmitData } from "@components/v2/settings/webhook/WebhookForm";

const EditWebhook = (
  props: inferSSRProps<typeof getServerSideProps> & { eventTypeId?: number; appId?: string }
) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();

  const { data: webhooks } = trpc.useQuery(["viewer.webhook.list"], {
    suspense: true,
    enabled: router.isReady,
  });

  const editWebhookMutation = trpc.useMutation("viewer.webhook.edit", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.webhook.list"]);
    },
    onError(error) {
      console.log(error);
    },
  });

  const subscriberUrlReserved = (subscriberUrl: string, id: string): boolean => {
    return !!webhooks?.find((webhook) => webhook.subscriberUrl === subscriberUrl && webhook.id !== id);
  };

  const onEditWebhook = (values: WebhookFormSubmitData) => {
    if (subscriberUrlReserved(values.subscriberUrl, props.webhook.id)) {
      showToast(t("webhook_subscriber_url_reserved"), "error");
      return;
    }

    if (values.changeSecret) {
      values.secret = values.newSecret.length ? values.newSecret : null;
    }

    if (!values.payloadTemplate) {
      values.payloadTemplate = null;
    }

    editWebhookMutation.mutate({
      id: props.webhook.id,
      subscriberUrl: values.subscriberUrl,
      eventTriggers: values.eventTriggers,
      active: values.active,
      payloadTemplate: values.payloadTemplate,
      secret: values.secret,
    });
    showToast(t("webhook_updated_successfully"), "success");
    router.back();
  };
  return (
    <>
      <Meta title="edit_webhook" description="add_webhook_description" backButton />
      <WebhookForm webhook={props.webhook} onSubmit={onEditWebhook} />
    </>
  );
};

EditWebhook.getLayout = getLayout;

export default EditWebhook;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;
  const session = await getSession({ req });
  const webhookId = asStringOrThrow(query.id);

  const webhook = await prisma.webhook.findFirst({
    where: {
      id: webhookId,
      userId: session?.user.id,
    },
    select: {
      id: true,
      subscriberUrl: true,
      payloadTemplate: true,
      active: true,
      eventTriggers: true,
      secret: true,
    },
  });

  if (!webhook) {
    return {
      notFound: true,
    };
  }

  return { props: { webhook } };
};
