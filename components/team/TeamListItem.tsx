import {CogIcon, TrashIcon, UserAddIcon, UsersIcon} from "@heroicons/react/outline";
import Dropdown from "../ui/Dropdown";
import {useState} from "react";

export default function TeamListItem(props) {

  const [ team, setTeam ] = useState(props.team);

  const acceptInvite = () => invitationResponse(true);
  const declineInvite = () => invitationResponse(false);

  const invitationResponse = (accept: boolean) => fetch('/api/user/membership', {
    method: accept ? 'PATCH' : 'DELETE',
    body: JSON.stringify({ teamId: props.team.id }),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then( () => {
    // success
    setTeam(null);
    props.onChange();
  });

  return (team && <li className="mb-2 mt-2 divide-y">
    <div className="flex justify-between mb-2 mt-2">
      <div>
        <UsersIcon className="text-gray-400 group-hover:text-gray-500 flex-shrink-0 -mt-4 mr-2 h-6 w-6 inline"/>
        <div className="inline-block -mt-1">
          <span className="font-bold text-blue-700 text-sm">{props.team.name}</span>
          <span className="text-xs text-gray-400 -mt-1 block capitalize">{props.team.role.toLowerCase()}</span>
        </div>
      </div>
      {props.team.role === 'INVITEE' && <div>
          <button className="btn-sm bg-transparent text-green-500 border border-green-500 px-3 py-1 rounded ml-2" onClick={acceptInvite}>Accept invitation</button>
          <button className="btn-sm bg-transparent px-2 py-1 ml-1">
            <TrashIcon className="h-6 w-6 inline text-gray-400 -mt-1" onClick={declineInvite} />
          </button>
      </div>}
      {props.team.role === 'MEMBER' && <div>
        <button onClick={declineInvite} className="btn-sm bg-transparent text-gray-400 border border-gray-400 px-3 py-1 rounded ml-2">Leave</button>
      </div>}
      {props.team.role === 'OWNER' && <div>
        <Dropdown className="relative inline-block text-left">
          <button className="btn-sm bg-transparent text-gray-400 px-3 py-1 rounded ml-2">
            <CogIcon className="h-6 w-6 inline text-gray-400" />
          </button>
          <ul role="menu" className="z-10 origin-top-right absolute right-0 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
            <li className="text-sm text-gray-700  hover:bg-gray-100 hover:text-gray-900" role="menuitem">
              <a className="block px-4 py-2" onClick={() => props.onActionSelect('invite')}>Invite member(s)</a>
            </li>
            <li className="text-sm text-gray-700  hover:bg-gray-100 hover:text-gray-900" role="menuitem">
              <a className="block px-4 py-2" onClick={() => props.onActionSelect('edit')}>Manage team</a>
            </li>
          </ul>
        </Dropdown>
      </div>}
    </div>
    {/*{props.team.userRole === 'Owner' && expanded && <div className="pt-2">
      {props.team.members.length > 0 && <div>
        <h2 className="text-lg font-medium text-gray-900 mb-1">Members</h2>
        <table className="table-auto mb-2 w-full">
          <tbody>
            {props.team.members.map( (member) => <tr key={member.email}>
              <td className="py-1 pl-2">Alex van Andel ({ member.email })</td>
              <td>Owner</td>
              <td className="text-right p-1">
                  <button className="btn-sm text-xs bg-transparent text-red-400 border border-red-400 px-3 py-1 rounded ml-2"><UserRemoveIcon className="text-red-400 group-hover:text-gray-500 flex-shrink-0 -mt-1 mr-1 h-4 w-4 inline"/>Remove</button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      <button className="btn-sm bg-transparent text-gray-400 border border-gray-400 px-3 py-1 rounded"><UserAddIcon className="text-gray-400 group-hover:text-gray-500 flex-shrink-0 -mt-1 h-6 w-6 inline"/> Invite member</button>
      <button className="btn-sm bg-transparent text-red-400 border border-red-400 px-3 py-1 rounded ml-2">Disband</button>
    </div>}*/}
  </li>);
}