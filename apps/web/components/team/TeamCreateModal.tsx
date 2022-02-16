import { UsersIcon } from "@heroicons/react/outline";
import { useRef, useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";

import { Alert } from "@components/ui/Alert";

interface Props {
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
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 z-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block transform rounded-sm bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
          <div className="mb-4 sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 sm:mx-0 sm:h-10 sm:w-10">
              <UsersIcon className="h-6 w-6 text-neutral-900" />
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
                className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              />
            </div>
            {errorMessage && <Alert severity="error" title={errorMessage} />}
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button type="submit" className="btn btn-primary">
                {t("create_team")}
              </button>
              <button onClick={props.onClose} type="button" className="btn btn-white ltr:mr-2">
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
