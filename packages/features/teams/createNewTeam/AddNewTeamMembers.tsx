import { Suspense } from "react";
import { useForm, Controller } from "react-hook-form";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, showToast, Avatar, Badge } from "@calcom/ui/v2";
import { List, ListItem, ListItemTitle } from "@calcom/ui/v2/core/List";
import { Form, TextField } from "@calcom/ui/v2/core/form/fields";

import AddNewTeamMemberSkeleton from "./AddNewTeamMemberSkeleton";

const AddNewTeamMembers = (props: { teamId: number }) => {
  const { t } = useLocale();
  const { data: owner } = trpc.useQuery(["viewer.me"]);

  return (
    <Suspense fallback={<AddNewTeamMemberSkeleton />}>
      <>
        <ul className="rounded-md border">
          <li className="flex space-x-2 p-6 text-sm">
            <Avatar size="mdLg" imageSrc={owner?.avatar} alt="owner-avatar" />
            <div>
              <div className="flex space-x-1">
                <p>{owner?.name}</p>
                <Badge variant="green">{t("you")}</Badge>
                <Badge variant="blue">{t("owner")}</Badge>
              </div>
              <p className="text-gray-600">{`${WEBAPP_URL}/${owner?.username}`}</p>
            </div>
          </li>
        </ul>

        <Button
          type="submit"
          color="secondary"
          StartIcon={Icon.FiPlus}
          className="mt-6 w-full justify-center">
          {t("add_team_member")}
        </Button>
      </>

      <hr className="my-6  border-neutral-200" />

      <Button type="submit" EndIcon={Icon.FiArrowRight} className="mt-6 w-full justify-center">
        {t("finish")}
      </Button>
    </Suspense>
  );
};

export default AddNewTeamMembers;
