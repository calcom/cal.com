import { useRouter } from "next/router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import objectKeys from "@calcom/lib/objectKeys";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, Dialog, DialogContent, DialogTrigger, Form, showToast, TextField } from "@calcom/ui/v2/core";
import Avatar from "@calcom/ui/v2/core/Avatar";
import ConfirmationDialogContent from "@calcom/ui/v2/core/ConfirmationDialogContent";
import Meta from "@calcom/ui/v2/core/Meta";
import { Label, TextArea } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

import ImageUploader from "@components/v2/settings/ImageUploader";
import MemberListItem from "@components/v2/settings/MemberListItem";

const MembersView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const { data: team } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    onError: () => {
      router.push("/settings");
    },
  });

  return (
    <>
      <Meta title="team_members" description="members_team_description" />
      <ul className="divide-y divide-gray-200 rounded-md border ">
        {team?.members.map((member) => {
          return <MemberListItem key={member.id} team={team} member={member} />;
        })}
      </ul>
    </>
  );
};

MembersView.getLayout = getLayout;

export default MembersView;
