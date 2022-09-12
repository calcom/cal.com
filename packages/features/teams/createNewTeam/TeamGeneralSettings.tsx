import { useForm, Controller } from "react-hook-form";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, showToast, Avatar } from "@calcom/ui/v2";
import { Form, TextField } from "@calcom/ui/v2/core/form/fields";

const TeamGeneralSettings = (props: { teamId: number }) => {
  const { t } = useLocale();

  return (
    <>
      <div>Team general settings{props.teamId} </div>
    </>
  );
};

export default TeamGeneralSettings;
