import { ChevronDownIcon, ChevronUpIcon, UserAddIcon, TrashIcon, UsersIcon } from "@heroicons/react/outline";

export default function TeamListItem(props) {
  return (<li className="mb-2 mt-2 divide-y">
    <div className="flex justify-between mb-2 mt-2">
      <div>
        <UsersIcon className="text-gray-400 group-hover:text-gray-500 flex-shrink-0 -mt-4 mr-2 h-6 w-6 inline"/>
        <div className="inline-block -mt-1">
          {props.team.userRole === "Owner" && <button className="text-blue-700 font-bold text-sm" onClick={ () => props.onManage() }>{props.team.name}</button>}
          {props.team.userRole !== "Owner" && <span className="font-bold text-gray-500 text-sm">{props.team.name}</span>}
          <span className="text-xs text-gray-400 font-bold -mt-1 block">{props.team.userRole}</span>
        </div>
      </div>
      {props.team.userRole === 'Invitee' && <div>
          <button className="btn-sm bg-transparent text-green-500 border border-green-500 px-3 py-1 rounded ml-2">Accept invitation</button>
          <button className="btn-sm bg-transparent px-2 ml-1">
            <TrashIcon className="h-6 w-6 inline text-gray-400 -mt-1" />
          </button>
      </div>}
      {props.team.userRole === 'Member' && <div>
        <button className="btn-sm bg-transparent text-gray-400 border border-gray-400 px-3 py-1 rounded ml-2">Leave</button>
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