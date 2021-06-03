import Head from 'next/head';
import prisma from '../../lib/prisma';
import Modal from '../../components/Modal';
import Shell from '../../components/Shell';
import SettingsShell from '../../components/Settings';
import { useState } from 'react';
import { useSession, getSession } from 'next-auth/client';
import Button from "../../components/ui/Button";
import {
  UsersIcon,
  UserAddIcon,
  UserRemoveIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LocationMarkerIcon
} from "@heroicons/react/outline";
import { ShieldCheckIcon } from "@heroicons/react/solid";
import TeamListItem from "../../components/TeamListItem";

export default function Teams(props) {

  const [ session, loading ] = useSession();
  const [ selectedTeam, setSelectedTeam ] = useState({});

  if (loading) {
    return <p className="text-gray-400">Loading...</p>;
  }

  const teams = [
    { name: "Flying Colours Life", userRole: "Owner", members: [
        { "name": "Alex van Andel", "email": "bartfalij@gmail.com", "role": "Owner" },
        { "email": "me@alexvanandel.com", "role": "Member" },
        { "email": "avanandel@flyingcolourslife.com", "role": "Member" },
      ] },
    { name: "Partner Wealth", userRole: "Member" }
  ];

  const invitations = [
    { name: "Asset Management", userRole: "Invitee" }
  ];

  return(
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
                <p className="mt-1 text-sm text-gray-500">
                  View, edit and create teams to organise relationships between users
                </p>
                {teams.length === 0 && <div className="border rounded text-center p-4 pt-3 mt-4">
                  <p className="text-sm text-gray-500">Team up with other users<br /> by adding a new team</p>
                  <UsersIcon className="text-blue-500 w-32 h-32 mx-auto"/>
                  <button className="btn-lg btn-primary">New team</button>
                </div>}
              </div>
              {teams.length > 0 && <div>
                <Button className="btn-sm btn-primary">New team</Button>
              </div>}
            </div>
            <div>
              <ul className="border px-2 rounded mt-2 mb-2 divide-y divide-gray-200">
                {teams.map(
                  (team: any) => <TeamListItem key={team.name} team={team} onManage={() => setSelectedTeam(team) }></TeamListItem>
                )}
              </ul>
              <h2 className="text-lg leading-6 font-medium text-gray-900">Open Invitations</h2>
              <ul className="border px-2 rounded mt-2 mb-2 divide-y divide-gray-200">
                {invitations.map( (team) => <TeamListItem key={team.name} team={team}></TeamListItem>)}
              </ul>
            </div>
            {/*<div>
              <h2 className="text-lg leading-6 font-medium text-gray-900">Transform account</h2>
              <p className="mt-1 text-sm text-gray-500">
                You cannot convert this account into a team until you leave all teams that you’re a member of.
              </p>
              <Button className="mt-2 btn-sm btn-primary opacity-50 cursor-not-allowed" disabled>Convert {props.user.username} into a team</Button>
            </div>*/}
          </div>
        </div>
        {Object.keys(selectedTeam).length > 0 &&
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <div className="sm:flex sm:items-start mb-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                      <UsersIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Edit {selectedTeam.name}</h3>
                    </div>
                  </div>
                  <form>
                    <div>
                      <div className="mb-4">
                        {selectedTeam.members.length > 0 && <div>
                          <div className="flex justify-between mb-2">
                            <h2 className="text-lg font-medium text-gray-900">Members</h2>
                            <button className="btn-xs btn-primary">Invite member</button>
                          </div>
                          <table className="table-auto mb-2 w-full text-sm">
                            <tbody>
                            {selectedTeam.members.map( (member) => <tr key={member.email}>
                              <td className="p-1">{member.name} {member.name && '(' + member.email + ')' }{!member.name && member.email}</td>
                              <td>{member.role}</td>
                              <td className="text-right py-2 px-1">
                                {/*<button className="btn-sm text-xs bg-transparent text-red-400 border border-red-400 px-3 py-1 rounded ml-2"><UserRemoveIcon className="text-red-400 group-hover:text-gray-500 flex-shrink-0 -mt-1 mr-1 h-4 w-4 inline"/>Remove</button>*/}
                              </td>
                            </tr>)}
                            </tbody>
                          </table>
                        </div>}
                      </div>
                      <div className="mb-4 border border-red-400 rounded p-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Tick the box below to disband this team.</label>
                        <label className="mt-1">
                          <input type="checkbox" name="title" id="title" required className="shadow-sm mr-2 focus:ring-blue-500 focus:border-blue-500  sm:text-sm border-gray-300 rounded-md" />
                          Disband this team
                        </label>
                      </div>
                    </div>
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button type="submit" className="btn btn-primary">
                        Update
                      </button>
                      <button onClick={() => setSelectedTeam({})} type="button" className="btn btn-white mr-2">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
            </div>
        </div>
        }
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: '/auth/login' } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      username: true,
      name: true
    }
  });

  return {
    props: {user}, // will be passed to the page component as props
  }
}