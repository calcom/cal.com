import { useEffect, useState } from "react";
import { UserRemoveIcon, UsersIcon } from "@heroicons/react/outline";
import { useSession } from "next-auth/client";

export default function EditTeamModal(props) {
  const [session] = useSession();
  const [members, setMembers] = useState([]);
  const [checkedDisbandTeam, setCheckedDisbandTeam] = useState(false);

  const loadMembers = () =>
    fetch("/api/teams/" + props.team.id + "/membership")
      .then((res: any) => res.json())
      .then((data) => setMembers(data.members));

  useEffect(() => {
    loadMembers();
  }, []);

  const deleteTeam = (e) => {
    e.preventDefault();
    return fetch("/api/teams/" + props.team.id, {
      method: "DELETE",
    }).then(props.onExit);
  };

  const removeMember = (member) => {
    return fetch("/api/teams/" + props.team.id + "/membership", {
      method: "DELETE",
      body: JSON.stringify({ userId: member.id }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(loadMembers);
  };

  return (
    <div
      className="fixed z-50 inset-0 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <div className="flex items-end justify-center pb-20 pt-4 px-4 min-h-screen text-center sm:block sm:p-0">
        <div
          className="fixed z-0 inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom pb-4 pt-5 px-4 text-left bg-white rounded-lg shadow-xl transform transition-all sm:align-middle sm:my-8 sm:p-6 sm:w-full sm:max-w-lg">
          <div className="mb-4 sm:flex sm:items-start">
            <div className="flex flex-shrink-0 items-center justify-center mx-auto w-12 h-12 bg-black bg-opacity-10 rounded-full sm:mx-0 sm:w-10 sm:h-10">
              <UsersIcon className="w-6 h-6 text-black" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-gray-900 text-lg font-medium leading-6" id="modal-title">
                Edit the {props.team.name} team
              </h3>
              <div>
                <p className="text-gray-400 text-sm">Manage and delete your team.</p>
              </div>
            </div>
          </div>
          <form>
            <div>
              <div className="mb-4">
                {members.length > 0 && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <h2 className="text-gray-900 text-lg font-medium">Members</h2>
                    </div>
                    <table className="table-auto mb-2 w-full text-sm">
                      <tbody>
                        {members.map((member) => (
                          <tr key={member.email}>
                            <td className="p-1">
                              {member.name} {member.name && "(" + member.email + ")"}
                              {!member.name && member.email}
                            </td>
                            <td className="capitalize">{member.role.toLowerCase()}</td>
                            <td className="px-1 py-2 text-right">
                              {member.email !== session.user.email && (
                                <button
                                  type="button"
                                  onClick={() => removeMember(member)}
                                  className="btn-sm ml-2 px-3 py-1 text-xs bg-transparent rounded">
                                  <UserRemoveIcon className="inline flex-shrink-0 -mt-1 mr-1 w-4 h-4 group-hover:text-gray-500 text-red-400" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="mb-4 p-2 px-4 border border-red-400 rounded">
                <p className="block text-gray-700 text-sm font-medium">Tick the box to disband this team.</p>
                <label className="mt-1">
                  <input
                    type="checkbox"
                    onChange={(e) => setCheckedDisbandTeam(e.target.checked)}
                    className="mr-2 focus:border-blue-500 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 sm:text-sm"
                  />
                  Disband this team
                </label>
              </div>
            </div>
            <div className="mt-5 sm:flex sm:flex-row-reverse sm:mt-4">
              {/*!checkedDisbandTeam && <button type="submit" className="btn btn-primary">
              Update
            </button>*/}
              {checkedDisbandTeam && (
                <button
                  onClick={deleteTeam}
                  className="btn px-2 text-white text-sm font-medium bg-red-700 rounded">
                  Disband Team
                </button>
              )}
              <button onClick={props.onExit} type="button" className="btn btn-white mr-2">
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
