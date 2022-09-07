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

import WebhookForm from "@components/v2/settings/webhook/WebhookForm";

const EditWebhook = (props) => {
  return (
    <>
      <Meta title="edit_webhook" description="add_webhook_description" backButton />
      <WebhookForm webhook={props.webhook} onSubmit={(values) => console.log(values)} />
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
