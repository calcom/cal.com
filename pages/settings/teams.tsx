import { UsersIcon } from "@heroicons/react/outline";
import { PlusIcon } from "@heroicons/react/solid";
import { useSession } from "next-auth/client";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { Member } from "@lib/member";
import { Team } from "@lib/team";

import Loader from "@components/Loader";
import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import EditTeam from "@components/team/EditTeam";
import TeamList from "@components/team/TeamList";
import TeamListItem from "@components/team/TeamListItem";
import Button from "@components/ui/Button";

export default function Teams() {
  const { t } = useLocale();
  const noop = () => undefined;
  const [, loading] = useSession();
  const [teams, setTeams] = useState([]);
  const [invites, setInvites] = useState([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [editTeamEnabled, setEditTeamEnabled] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>();
  const nameRef = useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;

  const handleErrors = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
    return resp.json();
  };

  const loadData = () => {
    fetch("/api/user/membership")
      .then(handleErrors)
      .then((data) => {
        setTeams(data.membership.filter((m: Member) => m.role !== "INVITEE"));
        setInvites(data.membership.filter((m: Member) => m.role === "INVITEE"));
      })
      .catch(console.log);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <Loader />;
  }

  const createTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    return fetch("/api/teams", {
      method: "POST",
      body: JSON.stringify({ name: nameRef?.current?.value }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(() => {
      loadData();
      setShowCreateTeamModal(false);
    });
  };

  const editTeam = (team: Team) => {
    setEditTeamEnabled(true);
    setTeamToEdit(team);
  };

  const onCloseEdit = () => {
    loadData();
    setEditTeamEnabled(false);
  };

  return (
    <Shell heading={t("teams")} subtitle={t("create_manage_teams_collaborative")}>
      <SettingsShell>
        {!editTeamEnabled && (
          <div className="divide-y divide-gray-200 lg:col-span-9">
            <div className="py-6 lg:pb-8">
              <div className="flex flex-col justify-between md:flex-row">
                <div>
                  {!(invites.length || teams.length) && (
                    <div className="sm:rounded-sm">
                      <div className="pb-5 pr-4 sm:pb-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">
                          {t("create_team_to_get_started")}
                        </h3>
                        <div className="max-w-xl mt-2 text-sm text-gray-500">
                          <p>{t("create_first_team_and_invite_others")}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-start mb-4">
                  <Button type="button" onClick={() => setShowCreateTeamModal(true)} color="secondary">
                    <PlusIcon className="group-hover:text-black text-gray-700 w-3.5 h-3.5 mr-2 inline-block" />
                    {t("new_team")}
                  </Button>
                </div>
              </div>
              <div>
                {!!teams.length && (
                  <TeamList teams={teams} onChange={loadData} onEditTeam={editTeam}></TeamList>
                )}

                {!!invites.length && (
                  <div>
                    <h2 className="text-lg font-medium leading-6 text-gray-900 font-cal">Open Invitations</h2>
                    <ul className="px-4 mt-4 mb-2 bg-white border divide-y divide-gray-200 rounded">
                      {invites.map((team: Team) => (
                        <TeamListItem
                          onChange={loadData}
                          key={team.id}
                          team={team}
                          onActionSelect={noop}></TeamListItem>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {!!editTeamEnabled && <EditTeam team={teamToEdit} onCloseEdit={onCloseEdit} />}
        {showCreateTeamModal && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 z-0 transition-opacity bg-gray-500 bg-opacity-75"
                aria-hidden="true"></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-sm shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="mb-4 sm:flex sm:items-start">
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full bg-neutral-100 sm:mx-0 sm:h-10 sm:w-10">
                    <UsersIcon className="w-6 h-6 text-neutral-900" />
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
                      className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    />
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <Button type="submit">{t("create_team")}</Button>
                    <Button
                      onClick={() => setShowCreateTeamModal(false)}
                      type="button"
                      className="mr-2"
                      color="secondary">
                      {t("cancel")}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </SettingsShell>
    </Shell>
  );
}
