import { UsersIcon } from "@heroicons/react/outline";
import { useState } from "react";

export default function MemberInvitationModal(props) {
  const [errorMessage, setErrorMessage] = useState("");

  const handleError = async (res) => {
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

    return fetch("/api/teams/" + props.team.id + "/invite", {
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
            <div className="flex flex-shrink-0 items-center justify-center mx-auto w-12 h-12 bg-black bg-opacity-5 rounded-full sm:mx-0 sm:w-10 sm:h-10">
              <UsersIcon className="w-6 h-6 text-black" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-gray-900 text-lg font-medium leading-6" id="modal-title">
                Invite a new member
              </h3>
              <div>
                <p className="text-gray-400 text-sm">Invite someone to your team.</p>
              </div>
            </div>
          </div>
          <form onSubmit={inviteMember}>
            <div>
              <div className="mb-4">
                <label htmlFor="inviteUser" className="block text-gray-700 text-sm font-medium">
                  Email or Username
                </label>
                <input
                  type="text"
                  name="inviteUser"
                  id="inviteUser"
                  placeholder="email@example.com"
                  required
                  className="block mt-1 px-3 py-2 w-full border focus:border-black border-gray-300 rounded-md focus:outline-none shadow-sm focus:ring-black sm:text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-gray-700 text-sm font-medium tracking-wide" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  className="block mt-1 w-full focus:border-black border-gray-300 rounded-md shadow-sm focus:ring-black sm:text-sm">
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
                    className="text-black focus:border-black border-gray-300 rounded-md shadow-sm focus:ring-black sm:text-sm"
                  />
                </div>
                <div className="ml-2 text-sm">
                  <label htmlFor="sendInviteEmail" className="text-gray-700 font-medium">
                    Send an invite email
                  </label>
                </div>
              </div>
            </div>
            {errorMessage && (
              <p className="text-red-700 text-sm">
                <span className="font-bold">Error: </span>
                {errorMessage}
              </p>
            )}
            <div className="mt-5 sm:flex sm:flex-row-reverse sm:mt-4">
              <button type="submit" className="btn btn-primary">
                Invite
              </button>
              <button onClick={props.onExit} type="button" className="btn btn-white mr-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
