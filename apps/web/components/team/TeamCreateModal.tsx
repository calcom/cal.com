import { UsersIcon } from "@heroicons/react/outline";
import { useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { Alert } from "@calcom/ui/Alert";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/Dialog";

import { trpc } from "@lib/trpc";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamCreate(props: Props) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const nameRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  const createTeamMutation = trpc.useMutation("viewer.teams.create", {
    onSuccess: () => {
      utils.invalidateQueries(["viewer.teams.list"]);
      props.onClose();
    },
    onError: (e) => {
      setErrorMessage(e?.message || t("something_went_wrong"));
    },
  });

  const createTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createTeamMutation.mutate({ name: nameRef?.current?.value });
  };

  return (
    <>
      <Dialog open={props.isOpen} onOpenChange={props.onClose}>
        <DialogContent>
          <div className="mb-4 sm:flex sm:items-start">
            <div className="bg-brand text-brandcontrast dark:bg-darkmodebrand dark:text-darkmodebrandcontrast mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-opacity-5 sm:mx-0 sm:h-10 sm:w-10">
              <UsersIcon className="text-brandcontrast h-6 w-6" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                {t("create_new_team")}
              </h3>
              <div>
                <p className="text-sm text-gray-400">{t("create_new_team_description")}</p>
              </div>
            </div>
          </div>
          <form onSubmit={createTeam}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t("name")}
              </label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                id="name"
                placeholder="Acme Inc."
                required
                className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 sm:text-sm"
              />
            </div>
            {errorMessage && <Alert severity="error" title={errorMessage} />}
            <DialogFooter>
              <Button type="button" color="secondary" onClick={props.onClose}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                className="ltr:ml-2 rtl:mr-2"
                data-testid="create-new-team-button">
                {t("create_team")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
