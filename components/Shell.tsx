import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/client";
import { Menu, Transition } from "@headlessui/react";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { SelectorIcon } from "@heroicons/react/outline";
import {
  CalendarIcon,
  ChatAltIcon,
  ClockIcon,
  CogIcon,
  ExternalLinkIcon,
  LinkIcon,
  LogoutIcon,
  PuzzleIcon,
} from "@heroicons/react/solid";
import Logo from "./Logo";
import classNames from "@lib/classNames";
import { Toaster } from "react-hot-toast";
import Avatar from "@components/Avatar";
import { User } from "@prisma/client";
import { HeadSeo } from "@components/seo/head-seo";

export default function Shell(props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();
  const telemetry = useTelemetry();

  const navigation = [
    {
      name: "Event Types",
      href: "/event-types",
      icon: LinkIcon,
      current: router.pathname.startsWith("/event-types"),
    },
    {
      name: "Bookings",
      href: "/bookings",
      icon: ClockIcon,
      current: router.pathname.startsWith("/bookings"),
    },
    {
      name: "Availability",
      href: "/availability",
      icon: CalendarIcon,
      current: router.pathname.startsWith("/availability"),
    },
    {
      name: "Integrations",
      href: "/integrations",
      icon: PuzzleIcon,
      current: router.pathname.startsWith("/integrations"),
    },
    {
      name: "Settings",
      href: "/settings/profile",
      icon: CogIcon,
      current: router.pathname.startsWith("/settings"),
    },
  ];

  useEffect(() => {
    telemetry.withJitsu((jitsu) => {
      return jitsu.track(telemetryEventTypes.pageView, collectPageParameters(router.pathname));
    });
  }, [telemetry]);

  if (!loading && !session) {
    router.replace("/auth/login");
  }

  const pageTitle = typeof props.heading === "string" ? props.heading : props.title;

  return session ? (
    <>
      <HeadSeo
        title={pageTitle}
        description={props.subtitle}
        nextSeoProps={{
          nofollow: true,
          noindex: true,
        }}
      />
      <div>
        <Toaster position="bottom-right" />
      </div>

      <div className="h-screen flex overflow-hidden bg-gray-100">
        {/* Static sidebar for desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-56">
            {/* Sidebar component, swap this element with another sidebar if you like */}
            <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <Link href="/event-types">
                  <a className="px-4">
                    <Logo small />
                  </a>
                </Link>
                <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                  {navigation.map((item) => (
                    <Link key={item.name} href={item.href}>
                      <a
                        className={classNames(
                          item.current
                            ? "bg-neutral-100 text-neutral-900"
                            : "text-neutral-500 hover:bg-gray-50 hover:text-neutral-900",
                          "group flex items-center px-2 py-2 text-sm font-medium rounded-sm"
                        )}>
                        <item.icon
                          className={classNames(
                            item.current
                              ? "text-neutral-500"
                              : "text-neutral-400 group-hover:text-neutral-500",
                            "mr-3 flex-shrink-0 h-5 w-5"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </a>
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex-shrink-0 flex p-4">
                <UserDropdown />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
            {/* show top navigation for md and smaller (tablet and phones) */}
            <nav className="md:hidden bg-white shadow p-4 flex justify-between items-center">
              <Link href="/event-types">
                <a>
                  <Logo />
                </a>
              </Link>
              <div className="flex gap-3 items-center self-center">
                <button className="bg-white p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                  <span className="sr-only">View notifications</span>
                  <Link href="/settings/profile">
                    <a>
                      <CogIcon className="h-6 w-6" aria-hidden="true" />
                    </a>
                  </Link>
                </button>
                <div className="mt-1">
                  <UserDropdown small bottom session={session} />
                </div>
              </div>
            </nav>
            <div className="py-8">
              <div className="block sm:flex justify-between px-4 sm:px-6 md:px-8">
                <div className="mb-8">
                  <h1 className="text-xl font-bold text-gray-900">{props.heading}</h1>
                  <p className="text-sm text-neutral-500 mr-4">{props.subtitle}</p>
                </div>
                <div className="mb-4 flex-shrink-0">{props.CTA}</div>
              </div>
              <div className="px-4 sm:px-6 md:px-8">{props.children}</div>

              {/* show bottom navigation for md and smaller (tablet and phones) */}
              <nav className="bottom-nav md:hidden flex fixed bottom-0 bg-white w-full shadow">
                {/* note(PeerRich): using flatMap instead of map to remove settings from bottom nav */}
                {navigation.flatMap((item, itemIdx) =>
                  item.name === "Settings" ? (
                    []
                  ) : (
                    <Link key={item.name} href={item.href}>
                      <a
                        className={classNames(
                          item.current ? "text-gray-900" : "text-neutral-400 hover:text-gray-700",
                          itemIdx === 0 ? "rounded-l-lg" : "",
                          itemIdx === navigation.length - 1 ? "rounded-r-lg" : "",
                          "group relative min-w-0 flex-1 overflow-hidden bg-white py-2 px-2 text-xs sm:text-sm font-medium text-center hover:bg-gray-50 focus:z-10"
                        )}
                        aria-current={item.current ? "page" : undefined}>
                        <item.icon
                          className={classNames(
                            item.current ? "text-gray-900" : "text-gray-400 group-hover:text-gray-500",
                            "block mx-auto flex-shrink-0 h-5 w-5 mb-1 text-center"
                          )}
                          aria-hidden="true"
                        />
                        <span>{item.name}</span>
                      </a>
                    </Link>
                  )
                )}
              </nav>

              {/* add padding to content for mobile navigation*/}
              <div className="block md:hidden pt-12" />
            </div>
          </main>
        </div>
      </div>
    </>
  ) : null;
}

function UserDropdown({ small, bottom }: { small?: boolean; bottom?: boolean }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((responseBody) => {
        setUser(responseBody.user);
      });
  }, []);

  return (
    <Menu as="div" className="w-full relative inline-block text-left">
      {({ open }) => (
        <>
          <div>
            {user && (
              <Menu.Button className="group w-full rounded-md text-sm text-left font-medium text-gray-700 focus:outline-none">
                <span className="flex w-full justify-between items-center">
                  <span className="flex min-w-0 items-center justify-between space-x-3">
                    <Avatar
                      imageSrc={user?.avatar}
                      displayName={user?.name}
                      className={classNames(
                        small ? "w-8 h-8" : "w-10 h-10",
                        "bg-gray-300 rounded-full flex-shrink-0"
                      )}
                    />
                    {!small && (
                      <span className="flex-1 flex flex-col min-w-0">
                        <span className="text-gray-900 text-sm font-medium truncate">{user?.name}</span>
                        <span className="text-neutral-500 font-normal text-sm truncate">
                          /{user?.username}
                        </span>
                      </span>
                    )}
                  </span>
                  {!small && (
                    <SelectorIcon
                      className="flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </Menu.Button>
            )}
          </div>
          <Transition
            show={open}
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95">
            <Menu.Items
              static
              className={classNames(
                bottom ? "origin-top top-1 right-0" : "origin-bottom bottom-14 left-0",
                "w-64 z-10 absolute mt-1 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-200 focus:outline-none"
              )}>
              <div className="py-1">
                <a href={"/" + user?.username} className="flex px-4 py-2 text-sm text-neutral-500">
                  View public page <ExternalLinkIcon className="ml-1 mt-1 w-3 h-3 text-neutral-400" />
                </a>
              </div>
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="https://calendso.com/slack"
                      target="_blank"
                      rel="noreferrer"
                      className={classNames(
                        active ? "bg-gray-100 text-gray-900" : "text-neutral-700",
                        "flex px-4 py-2 text-sm font-medium"
                      )}>
                      <svg
                        viewBox="0 0 2447.6 2452.5"
                        className={classNames(
                          "text-neutral-400 group-hover:text-neutral-500",
                          "mt-0.5 mr-3 flex-shrink-0 h-4 w-4"
                        )}
                        xmlns="http://www.w3.org/2000/svg">
                        <g clipRule="evenodd" fillRule="evenodd">
                          <path
                            d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z"
                            fill="#9BA6B6"></path>
                          <path
                            d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z"
                            fill="#9BA6B6"></path>
                          <path
                            d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z"
                            fill="#9BA6B6"></path>
                          <path
                            d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0"
                            fill="#9BA6B6"></path>
                        </g>
                      </svg>
                      Join our Slack
                    </a>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="mailto:feedback@calendso.com"
                      className={classNames(
                        active ? "bg-gray-100 text-gray-900" : "text-neutral-700",
                        "flex px-4 py-2 text-sm font-medium"
                      )}>
                      <ChatAltIcon
                        className={classNames(
                          "text-neutral-400 group-hover:text-neutral-500",
                          "mr-2 flex-shrink-0 h-5 w-5"
                        )}
                        aria-hidden="true"
                      />
                      Feedback
                    </a>
                  )}
                </Menu.Item>
              </div>
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <a
                      onClick={() => signOut({ callbackUrl: "/auth/logout" })}
                      className={classNames(
                        active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                        "flex px-4 py-2 text-sm font-medium"
                      )}>
                      <LogoutIcon
                        className={classNames(
                          "text-neutral-400 group-hover:text-neutral-500",
                          "mr-2 flex-shrink-0 h-5 w-5"
                        )}
                        aria-hidden="true"
                      />
                      Sign out
                    </a>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
}
