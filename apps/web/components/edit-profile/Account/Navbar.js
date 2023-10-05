"use client";

import { SignOut, LinkSimple, User } from "@phosphor-icons/react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { forgotPassword } from "lib/firebase";
import Link from "next/link";
import toast from "react-hot-toast";

const UserMenu = ({ uid, logOut, resetPassword }) => {
  const menuItems = [
    {
      label: "View public profile",
      icon: <LinkSimple className="mr-2 h-4 w-4" />,
      href: `/${uid}`,
      target: "_blank",
    },
    {
      label: "Signout",
      icon: <SignOut className="mr-2 h-4 w-4" />,
      href: `/auth/logout`,
    },
  ];

  return (
    <div>
      <Menu.Root>
        <Menu.Trigger asChild>
          <button title="Profile" className="rounded-full p-2 hover:bg-gray-100">
            <User className="h-5 w-5" />
          </button>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={5}
            className="z-[100] w-48 rounded border bg-white px-1.5 py-1 shadow-md md:w-56">
            {menuItems.map(({ label, icon, target, href, onClick }, i) => (
              <Menu.Item key={`${label}-${i}`} asChild>
                {href ? (
                  <Link
                    href={href}
                    target={target || "_self"}
                    className="flex w-full flex-grow cursor-pointer select-none items-center rounded-md p-2 text-sm outline-none hover:bg-gray-50">
                    {icon}
                    {label}
                  </Link>
                ) : (
                  <button
                    className="flex w-full flex-grow cursor-pointer select-none items-center rounded-md p-2 text-sm outline-none hover:bg-gray-50"
                    onClick={onClick}>
                    {icon}
                    {label}
                  </button>
                )}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
};

const Navbar = ({ uid, logOut, email }) => {
  async function resetPassword() {
    if (!email) return;
    try {
      await forgotPassword(email);
      toast.success("Check your email for further instructions 😊");
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong 😕");
    }
  }
  return (
    <nav className="sticky top-0 z-50 bg-white shadow">
      <div className="mx-auto max-w-6xl px-4 sm:px-0">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <Link href="/" className="flex flex-shrink-0 items-center">
              <img className="h-6 w-auto sm:h-8" src="/borg/borg-logo.svg" alt="Borg" />
            </Link>
          </div>
          <div className="flex items-center">
            <UserMenu uid={uid} logOut={logOut} resetPassword={resetPassword} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
