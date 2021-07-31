import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/client";
import { Dialog, Menu, Transition } from "@headlessui/react";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "../lib/telemetry";

import { MenuIcon, SelectorIcon, XIcon } from "@heroicons/react/outline";
import {
  CalendarIcon,
  ClockIcon,
  CogIcon,
  PuzzleIcon,
  SupportIcon,
  ChatAltIcon,
  LogoutIcon,
  ExternalLinkIcon,
  LinkIcon,
} from "@heroicons/react/solid";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Shell(props) {
  const router = useRouter();
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
    { name: "Settings", href: "/settings", icon: CogIcon, current: router.pathname.startsWith("/settings") },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    telemetry.withJitsu((jitsu) => {
      return jitsu.track(telemetryEventTypes.pageView, collectPageParameters(router.pathname));
    });
  }, [telemetry]);

  const logoutHandler = () => {
    signOut({ redirect: false }).then(() => router.push("/auth/logout"));
  };

  if (!loading && !session) {
    router.replace("/auth/login");
  }

  return session ? (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          static
          className="fixed inset-0 flex z-40 md:hidden"
          open={sidebarOpen}
          onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <Dialog.Overlay className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full">
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0">
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setSidebarOpen(false)}>
                    <span className="sr-only">Close sidebar</span>
                    <XIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </Transition.Child>
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4">
                  <img
                    className="h-8 w-auto"
                    src="https://tailwindui.com/img/logos/workflow-logo-indigo-600-mark-gray-800-text.svg"
                    alt="Workflow"
                  />
                </div>
                <nav className="mt-5 px-2 space-y-1">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        item.current
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        "group flex items-center px-2 py-2 text-base font-medium rounded-md"
                      )}>
                      <item.icon
                        className={classNames(
                          item.current ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500",
                          "mr-4 flex-shrink-0 h-6 w-6"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </a>
                  ))}
                </nav>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <a href="#" className="flex-shrink-0 group block">
                  <div className="flex items-center">
                    <div>
                      <img
                        className="inline-block h-10 w-10 rounded-full"
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt=""
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                        Tom Cook
                      </p>
                      <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700">
                        View profile
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </Transition.Child>
          <div className="flex-shrink-0 w-14">{/* Force sidebar to shrink to fit close icon */}</div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center font-kollektif flex-shrink-0 px-4">
                <h1 className="brand-logo font-kollektif inline">
                  <strong>Calendso</strong>
                </h1>
              </div>
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
                          item.current ? "text-neutral-500" : "text-neutral-400 group-hover:text-neutral-500",
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
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              {/* User account dropdown */}
              <Menu as="div" className="w-full relative inline-block text-left">
                {({ open }) => (
                  <>
                    <div>
                      <Menu.Button className="group w-full rounded-md text-sm text-left font-medium text-gray-700 focus:outline-none">
                        <span className="flex w-full justify-between items-center">
                          <span className="flex min-w-0 items-center justify-between space-x-3">
                            <img
                              className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"
                              src={
                                session.user.image
                                  ? session.user.image
                                  : "https://eu.ui-avatars.com/api/?background=fff&color=039be5&name=" +
                                    encodeURIComponent(session.user.name || "")
                              }
                              alt=""
                            />
                            <span className="flex-1 flex flex-col min-w-0">
                              <span className="text-gray-900 text-sm font-medium truncate">
                                {session.user.name}
                              </span>
                              <span className="text-neutral-500 font-normal text-sm truncate">
                                {session.user.username}
                              </span>
                            </span>
                          </span>
                          <SelectorIcon
                            className="flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                            aria-hidden="true"
                          />
                        </span>
                      </Menu.Button>
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
                        className="w-64 z-10 origin-top absolute bottom-14 left-0 mt-1 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-200 focus:outline-none">
                        <div className="py-1">
                          <a
                            href={"/" + session.user.username}
                            className="flex px-4 py-2 text-sm text-neutral-500 pb-6">
                            View public page <ExternalLinkIcon className="ml-1 w-4 h-4 text-neutral-400" />
                            <span className="absolute top-8 text-neutral-900 font-medium">
                              {window.location.hostname}/bailey
                            </span>
                          </a>
                        </div>
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <a
                                href="#"
                                className={classNames(
                                  active ? "bg-gray-100 text-gray-900" : "text-neutral-700",
                                  "flex px-4 py-2 text-sm font-medium"
                                )}>
                                <SupportIcon
                                  className={classNames(
                                    "text-neutral-400 group-hover:text-neutral-500",
                                    "mr-2 flex-shrink-0 h-5 w-5"
                                  )}
                                  aria-hidden="true"
                                />
                                Help
                              </a>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <a
                                href="#"
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
                                href="#"
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
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}>
            <span className="sr-only">Open sidebar</span>
            <MenuIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-kollektif font-semibold text-gray-900">{props.heading}</h1>
            </div>
            <div className="px-4 sm:px-6 md:px-8">{props.children}</div>
          </div>
        </main>
      </div>
    </div>
  ) : null;
}
