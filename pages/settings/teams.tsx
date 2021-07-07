import { GetServerSideProps } from "next";
import Head from "next/head";
import Shell from "../../components/Shell";
import SettingsShell from "../../components/Settings";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import { getSession, useSession } from "next-auth/client";
import { UsersIcon } from "@heroicons/react/outline";
import TeamList from "../../components/team/TeamList";
import TeamListItem from "../../components/team/TeamListItem";

export default function Teams() {
  const [, loading] = useSession();
  const [teams, setTeams] = useState([]);
  const [invites, setInvites] = useState([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  const handleErrors = async (resp) => {
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
        setTeams(data.membership.filter((m) => m.role !== "INVITEE"));
        setInvites(data.membership.filter((m) => m.role === "INVITEE"));
      })
      .catch(console.log);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <p className="text-gray-400">Loading...</p>;
  }

  const createTeam = (e) => {
    e.preventDefault();

    return fetch("/api/teams", {
      method: "POST",
      body: JSON.stringify({ name: e.target.elements["name"].value }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(() => {
      loadData();
      setShowCreateTeamModal(false);
    });
  };

  return (
    <Shell heading="Teams">
      <Head>
        <title>Teams | Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <SettingsShell>
        <div className="divide-y divide-gray-200 lg:col-span-9">
          <div className="py-6 px-4 sm:p-6 lg:pb-8">
            <div className="flex justify-between">
              <div>
                <h2 className="text-lg leading-6 font-medium text-gray-900">Your teams</h2>
                <p className="mt-1 text-sm text-gray-500 mb-4">
                  View, edit and create teams to organise relationships between users
                </p>
                {!(invites.length || teams.length) && (
                  <div className="bg-gray-50 sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Create a team to get started
                      </h3>
                      <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>Create your first team and invite other users to work together with you.</p>
                      </div>
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={() => setShowCreateTeamModal(true)}
                          className="btn btn-primary">
                          Create new team
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!!(invites.length || teams.length) && (
                <div>
                  <button className="btn-sm btn-primary" onClick={() => setShowCreateTeamModal(true)}>
                    Create new team
                  </button>
                </div>
              )}
            </div>
            <div>
              {!!teams.length && <TeamList teams={teams} onChange={loadData}></TeamList>}

              {!!invites.length && (
                <div>
                  <h2 className="text-lg leading-6 font-medium text-gray-900">Open Invitations</h2>
                  <ul className="border px-2 rounded mt-2 mb-2 divide-y divide-gray-200">
                    {invites.map((team) => (
                      <TeamListItem onChange={loadData} key={team.id} team={team}></TeamListItem>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/*{teamsLoaded && <div className="flex justify-between">
              <div>
                <h2 className="text-lg leading-6 font-medium text-gray-900 mb-1">Transform account</h2>
                <p className="text-sm text-gray-500 mb-1">
                  {membership.length !== 0 && "You cannot convert this account into a team until you leave all teams that you’re a member of."}
                  {membership.length === 0 && "A user account can be turned into a team, as a team ...."}
                </p>
              </div>
              <div>
                <button className="mt-2 btn-sm btn-primary opacity-50 cursor-not-allowed" disabled>Convert {session.user.username} into a team</button>
              </div>
            </div>}*/}
          </div>
        </div>
        {showCreateTeamModal && (
          <div
            className="fixed z-10 inset-0 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                aria-hidden="true"></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <UsersIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Create a new team
                    </h3>
                    <div>
                      <p className="text-sm text-gray-400">Create a new team to collaborate with users.</p>
                    </div>
                  </div>
                </div>
                <form onSubmit={createTeam}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      placeholder="Acme Inc."
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="btn btn-primary">
                      Create team
                    </button>
                    <button
                      onClick={() => setShowCreateTeamModal(false)}
                      type="button"
                      className="btn btn-white mr-2">
                      Cancel
                    </button>
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

// Export the `session` prop to use sessions with Server Side Rendering
export const getServerSideProps: GetServerSideProps<{ session: Session | null }> = async (context) => {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  return {
    props: { session },
  };
};
