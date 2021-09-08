import { useRef, useState } from "react";
import prisma from "@lib/prisma";
import Modal from "@components/Modal";
import Shell from "@components/Shell";
import SettingsShell from "@components/Settings";
import { useSession } from "next-auth/client";
import Loader from "@components/Loader";
import { getSession } from "@lib/auth";

export default function Settings() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const oldPasswordRef = useRef<HTMLInputElement>();
  const newPasswordRef = useRef<HTMLInputElement>();

  if (loading) {
    return <Loader />;
  }

  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
  };

  async function changePasswordHandler(event) {
    event.preventDefault();

    const enteredOldPassword = oldPasswordRef.current.value;
    const enteredNewPassword = newPasswordRef.current.value;

    // TODO: Add validation

    /*eslint-disable */
    const response = await fetch("/api/auth/changepw", {
      method: "PATCH",
      body: JSON.stringify({ oldPassword: enteredOldPassword, newPassword: enteredNewPassword }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    /*eslint-enable */

    setSuccessModalOpen(true);
  }

  return (
    <Shell heading="Change Password" subtitle="Change the password that you use to sign in to your account.">
      <SettingsShell>
        <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={changePasswordHandler}>
          <div className="py-6 lg:pb-8">
            <div className="flex">
              <div className="w-1/2 mr-2">
                <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <div className="mt-1">
                  <input
                    ref={oldPasswordRef}
                    type="password"
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
                    ref={newPasswordRef}
                    type="password"
                    name="new_password"
                    id="new_password"
                    required
                    className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-sm"
                    placeholder="Your super secure new password"
                  />
                </div>
              </div>
            </div>
            <hr className="mt-8" />
            <div className="py-4 flex justify-end">
              <button
                type="submit"
                className="ml-2 bg-neutral-900 border border-transparent rounded-sm shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                Save
              </button>
            </div>
          </div>
        </form>
        <Modal
          heading="Password updated successfully"
          description="Your password has been successfully changed."
          open={successModalOpen}
          handleClose={closeSuccessModal}
        />
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      username: true,
      name: true,
    },
  });

  return {
    props: { user }, // will be passed to the page component as props
  };
}
