import { GetStaticPaths, GetStaticProps } from "next";
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
import ImageUploader from "@components/v2/settings/ImageUploader";

const EditWebhookView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const urlParams = router.query;

  return (
    <>
      <Meta title="edit_webhook_title" description="add_webhook_description" backButton />

      <div>Edit webhook</div>
    </>
  );
};

EditWebhookView.getLayout = getLayout;

export default EditWebhookView;
