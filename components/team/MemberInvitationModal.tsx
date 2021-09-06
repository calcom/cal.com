import { UsersIcon } from "@heroicons/react/outline";
import { useState } from "react";
import Button from "@components/ui/Button";
import { Team } from "@lib/team";

export default function MemberInvitationModal(props: { team: Team | undefined | null; onExit: () => void }) {
  const [errorMessage, setErrorMessage] = useState("");

  const handleError = async (res: Response) => {
    const responseData = await res.json();

    if (res.ok === false) {
      setErrorMessage(responseData.message);
      throw new Error(responseData.message);
    }

    return responseData;
  };

  const inviteMember = (e) => {
    e.preventDefault();

    const payload = {
      role: e.target.elements["role"].value,
      usernameOrEmail: e.target.elements["inviteUser"].value,
      sendEmailInvitation: e.target.elements["sendInviteEmail"].checked,
    };

    return fetch("/api/teams/" + props?.team?.id + "/invite", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(handleError)
      .then(props.onExit)
      .catch(() => {
        // do nothing.
      });
  };

  return (
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

        <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="mb-4 sm:flex sm:items-start">
            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-black rounded-full bg-opacity-5 sm:mx-0 sm:h-10 sm:w-10">
              <UsersIcon className="w-6 h-6 text-black" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                Invite a new member
              </h3>
              <div>
                <p className="text-sm text-gray-400">Invite someone to your team.</p>
              </div>
            </div>
          </div>
          <form onSubmit={inviteMember}>
            <div>
              <div className="mb-4">
                <label htmlFor="inviteUser" className="block text-sm font-medium text-gray-700">
                  Email or Username
                </label>
                <input
                  type="text"
                  name="inviteUser"
                  id="inviteUser"
                  placeholder="email@example.com"
                  required
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium tracking-wide text-gray-700" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm">
                  <option value="MEMBER">Member</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="sendInviteEmail"
                    defaultChecked
                    id="sendInviteEmail"
                    className="text-black border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
                <div className="ml-2 text-sm">
                  <label htmlFor="sendInviteEmail" className="font-medium text-gray-700">
                    Send an invite email
                  </label>
                </div>
              </div>
            </div>
            {errorMessage && (
              <p className="text-sm text-red-700">
                <span className="font-bold">Error: </span>
                {errorMessage}
              </p>
            )}
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <Button type="submit" color="primary" className="ml-2">
                Invite
              </Button>
              <Button type="button" color="secondary" onClick={props.onExit}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
