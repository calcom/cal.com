import crypto from "crypto";
import { GetServerSidePropsContext } from "next";
import { signOut } from "next-auth/react";
import { Trans } from "next-i18next";
import { useRouter } from "next/router";
import { useRef, useState, BaseSyntheticEvent, FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";

import { ErrorCode, getSession } from "@calcom/lib/auth";
import { WEBAPP_URL } from "@calcom/lib/constants";
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
import Loader from "@calcom/ui/v2/core/Loader";
import Meta from "@calcom/ui/v2/core/Meta";
import { Form, Label, TextField, PasswordField } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import showToast from "@calcom/ui/v2/core/notifications";
import { List } from "@calcom/ui/v2/modules/List";

import { QueryCell } from "@lib/QueryCell";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import TwoFactor from "@components/auth/TwoFactor";
import ImageUploader from "@components/v2/settings/ImageUploader";
import WebhookListItem from "@components/v2/settings/webhook/WebhookListItem";

const WebhooksView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const urlParams = {
    eventTypeId: parseInt(router.query.eventTypeId as string),
    appId: router.query.eventTypeId as string,
  };

  const query = trpc.useQuery(
    [
      "viewer.webhook.list",
      { eventTypeId: urlParams.eventTypeId || undefined, appId: urlParams.appId || undefined },
    ],
    {
      suspense: true,
      enabled: router.isReady,
    }
  );
  return (
    <>
      <Meta title="webhooks" description="webhooks_description" />

      <QueryCell
        query={query}
        customLoader={<Loader />}
        success={({ data }) => (
          <div>
            {data.length ? (
              <List className="mt-6">
                {data.map((item) => (
                  <WebhookListItem
                    key={item.id}
                    webhook={item}
                    // onEditWebhook={() => {
                    //   setEditing(item);
                    //   setEditModalOpen(true);
                    // }}
                  />
                ))}
              </List>
            ) : null}

            <Button
              color="secondary"
              StartIcon={Icon.FiPlus}
              href={`${WEBAPP_URL}/v2/settings/developer/webhooks/new`}>
              {t("new_webhook")}
            </Button>
          </div>
        )}
      />
    </>
  );
};

WebhooksView.getLayout = getLayout;

export default WebhooksView;
