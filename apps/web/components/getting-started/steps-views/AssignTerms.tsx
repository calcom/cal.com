import { DocusealForm } from "@docuseal/react";
import type { FormEvent } from "react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui";

interface AssignTermsProps {
  nextStep: () => void;
}

const COMPLETED_ASSIGNMENT_STATUS = "completed";

const AssignTerms = ({ nextStep }: AssignTermsProps) => {
  const [termsIsAssigned, setTermsIsAssigned] = useState(false);
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    nextStep();
  };

  return (
    <form onSubmit={onSubmit}>
      <span>Por favor, leia atentamente e preencha todas as partes solicitadas.</span>
      <div className="mt-2 h-[40vh] overflow-scroll">
        <DocusealForm
          src="https://docs.yinflow.life/d/wGickgWzeH5HUF"
          email={user.email}
          onComplete={(data) => {
            if (data.status === COMPLETED_ASSIGNMENT_STATUS) setTermsIsAssigned(true);
          }}
          onLoad={(data) => {
            if (data.completed_submitter) setTermsIsAssigned(true);
          }}
        />
      </div>
      <Button
        disabled={!termsIsAssigned}
        EndIcon="arrow-right"
        type="submit"
        className="mt-8 w-full items-center justify-center">
        {t("next_step_text")}
      </Button>
    </form>
  );
};

export default AssignTerms;
