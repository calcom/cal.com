"use client";

import type { GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";

import PageWrapper from "@components/PageWrapper";

interface PageProps {
  token: string;
  updateSession: string;
  updatedEmail: string;
}

function VerifyEmailChange(props: PageProps) {
  const { data: session, update } = useSession();

  useEffect(() => {
    async function updateSession() {
      update({
        ...session,
        email: props.updatedEmail,
      });
    }
    if (props.updateSession) {
      updateSession();
    }
  }, [props.updateSession, props.updatedEmail, session, update]);

  return <></>;
}

const tokenSchema = z.object({
  token: z.string(),
});

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { token } = tokenSchema.parse(context.query);

  if (!token) {
    return {
      notFound: true,
    };
  }

  const params = new URLSearchParams({
    token,
  });

  // Fetch data based on `slug` from your API or any data source
  const response = await fetch(`${WEBAPP_URL}/api/auth/verify-email?${params.toString()}`);
  const data = await response.json();

  return {
    props: {
      data: {
        updateSession: true,
        token,
        updatedEmail: data.updatedEmail,
      },
    },
  };
}

export default VerifyEmailChange;
VerifyEmailChange.PageWrapper = PageWrapper;
