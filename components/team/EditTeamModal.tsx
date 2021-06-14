import {useEffect, useState} from "react";
import {UsersIcon,UserRemoveIcon} from "@heroicons/react/outline";
import {useSession} from "next-auth/client";

export default function EditTeamModal(props) {

  const [ session, loading ] = useSession();
  const [ members, setMembers ] = useState([]);
  const [ checkedDisbandTeam, setCheckedDisbandTeam ] = useState(false);

  const loadMembers = () => fetch('/api/teams/' + props.team.id + '/membership')
    .then( (res: any) => res.json() ).then( (data) => setMembers(data.members) );

  useEffect( () => {
    loadMembers();
  }, []);

  const deleteTeam = (e) => {
    e.preventDefault();
    return fetch('/api/teams/' + props.team.id, {
      method: 'DELETE',
    }).then(props.onExit);
  }

  const removeMember = (member) => {
    return fetch('/api/teams/' + props.team.id + '/membership', {
      method: 'DELETE',
      body: JSON.stringify({ userId: member.id }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(loadMembers);
  }

  return (<div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

      <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
        <div className="sm:flex sm:items-start mb-4">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
            <UsersIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Edit the {props.team.name} team</h3>
            <div>
              <p className="text-sm text-gray-400">
                Manage and delete your team.
              </p>
            </div>
          </div>
        </div>
        <form>
          <div>
            <div className="mb-4">
              {members.length > 0 && <div>
                <div className="flex justify-between mb-2">
                  <h2 className="text-lg font-medium text-gray-900">Members</h2>
                </div>
                <table className="table-auto mb-2 w-full text-sm">
                  <tbody>
                  {members.map( (member) => <tr key={member.email}>
                    <td className="p-1">{member.name} {member.name && '(' + member.email + ')' }{!member.name && member.email}</td>
                    <td className="capitalize">{member.role.toLowerCase()}</td>
                    <td className="text-right py-2 px-1">
                      {member.email !== session.user.email &&
                      <button
                        type="button"
                        onClick={(e) => removeMember(member)}
                        className="btn-sm text-xs bg-transparent px-3 py-1 rounded ml-2">
                        <UserRemoveIcon className="text-red-400 group-hover:text-gray-500 flex-shrink-0 -mt-1 mr-1 h-4 w-4 inline"/>
                      </button>
                      }
                    </td>
                  </tr>)}
                  </tbody>
                </table>
              </div>}
            </div>
            <div className="mb-4 border border-red-400 rounded p-2 px-4">
              <p className="block text-sm font-medium text-gray-700">Tick the box to disband this team.</p>
              <label className="mt-1">
                <input type="checkbox" onChange={(e) => setCheckedDisbandTeam(e.target.checked)} className="shadow-sm mr-2 focus:ring-blue-500 focus:border-blue-500  sm:text-sm border-gray-300 rounded-md" />
                Disband this team
              </label>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            {/*!checkedDisbandTeam && <button type="submit" className="btn btn-primary">
              Update
            </button>*/}
            {checkedDisbandTeam && <button onClick={deleteTeam} className="btn bg-red-700 rounded text-white px-2 font-medium text-sm">
              Disband Team
            </button>}
            <button onClick={props.onExit} type="button" className="btn btn-white mr-2">
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>);
}