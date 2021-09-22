import React, { SyntheticEvent, useState } from "react";

import { ErrorCode } from "@lib/auth";

import Modal from "@components/Modal";

const errorMessages: { [key: string]: string } = {
  [ErrorCode.IncorrectPassword]: "Current password is incorrect",
  [ErrorCode.NewPasswordMatchesOld]:
    "New password matches your old password. Please choose a different password.",
};

const ChangePasswordSection = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
  };

  async function changePasswordHandler(e: SyntheticEvent) {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/changepw", {
        method: "PATCH",
        body: JSON.stringify({ oldPassword, newPassword }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200) {
        setOldPassword("");
        setNewPassword("");
        setSuccessModalOpen(true);
        return;
      }

      const body = await response.json();
      setErrorMessage(errorMessages[body.error] || "Something went wrong. Please try again");
    } catch (err) {
      console.error("Error changing password", err);
      setErrorMessage("Something went wrong. Please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="mt-6">
        <h2 className="font-cal text-lg leading-6 font-medium text-gray-900">Change Password</h2>
      </div>
      <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={changePasswordHandler}>
        <div className="py-6 lg:pb-8">
          <div className="flex">
            <div className="w-1/2 mr-2">
              <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  value={oldPassword}
                  onInput={(e) => setOldPassword(e.currentTarget.value)}
                  name="current_password"
                  id="current_password"
                  required
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-sm"
                  placeholder="Your old password"
                />
              </div>
            </div>
            <div className="w-1/2 ml-2">
              <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  name="new_password"
                  id="new_password"
                  value={newPassword}
                  required
                  onInput={(e) => setNewPassword(e.currentTarget.value)}
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-sm"
                  placeholder="Your super secure new password"
                />
              </div>
            </div>
          </div>
          {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
          <div className="py-8 flex justify-end">
            <button
              type="submit"
              className="ml-2 bg-neutral-900 border border-transparent rounded-sm shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
              Save
            </button>
          </div>
          <hr className="mt-4" />
        </div>
      </form>
      <Modal
        heading="Password updated successfully"
        description="Your password has been successfully changed."
        open={successModalOpen}
        handleClose={closeSuccessModal}
      />
    </>
  );
};

export default ChangePasswordSection;
