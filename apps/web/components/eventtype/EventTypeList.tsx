// TODO: replace headlessui with radix-ui
import { Menu, Transition } from "@headlessui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DotsHorizontalIcon,
  ExternalLinkIcon,
  DuplicateIcon,
  LinkIcon,
  UploadIcon,
  ClipboardCopyIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/solid";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { Fragment, useEffect, useState } from "react";

import { Button } from "@calcom/ui";
import Dropdown, {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@calcom/ui/Dropdown";

import classNames from "@lib/classNames";
import { HttpError } from "@lib/core/http/error";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { inferQueryOutput, trpc } from "@lib/trpc";

import { Dialog, DialogTrigger } from "@components/Dialog";
import { Tooltip } from "@components/Tooltip";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import AvatarGroup from "@components/ui/AvatarGroup";

import { EventTypeParent } from "./CreateEventType";

type EventTypeGroup = inferQueryOutput<"viewer.eventTypes">["eventTypeGroups"][number];
type EventType = EventTypeGroup["eventTypes"][number];
interface EventTypeListProps {
  profile: EventTypeParent;
  readOnly: boolean;
  types: EventType[];
}

export const EventTypeList = ({ profile, readOnly, types }: EventTypeListProps): JSX.Element => {
  const { t } = useLocale();
  const router = useRouter();

  const utils = trpc.useContext();
  const mutation = trpc.useMutation("viewer.eventTypeOrder", {
    onError: (err) => {
      console.error(err.message);
    },
    async onSettled() {
      await utils.cancelQuery(["viewer.eventTypes"]);
      await utils.invalidateQueries(["viewer.eventTypes"]);
    },
  });
  const [sortableTypes, setSortableTypes] = useState(types);
  useEffect(() => {
    setSortableTypes(types);
  }, [types]);
  function moveEventType(index: number, increment: 1 | -1) {
    const newList = [...sortableTypes];

    const type = sortableTypes[index];
    const tmp = sortableTypes[index + increment];
    if (tmp) {
      newList[index] = tmp;
      newList[index + increment] = type;
    }
    setSortableTypes(newList);
    mutation.mutate({
      ids: newList.map((type) => type.id),
    });
  }

  async function deleteEventTypeHandler(id: number) {
    const payload = { id };
    deleteMutation.mutate(payload);
  }

  // inject selection data into url for correct router history
  const openModal = (option, type: EventType) => {
    // setTimeout fixes a bug where the url query params are removed immediately after opening the modal
    setTimeout(() => {
      router.push(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
            dialog: "new-eventtype",
            new: "1",
            eventPage: option.slug,
            title: type.title,
            slug: type.slug,
            description: type.description,
            length: type.length,
            type: type.schedulingType,
            teamId: option.teamId,
          },
        },
        undefined,
        { shallow: true }
      );
    });
  };

  const deleteMutation = trpc.useMutation("viewer.eventTypes.delete", {
    onSuccess: async () => {
      await utils.invalidateQueries(["viewer.eventTypes"]);
      showToast(t("event_type_deleted_successfully"), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const [isNativeShare, setNativeShare] = useState(true);

  useEffect(() => {
    if (!navigator.share) {
      setNativeShare(false);
    }
  }, []);

  return (
    <div className="-mx-4 mb-16 overflow-hidden rounded-sm border border-gray-200 bg-white sm:mx-0">
      <ul className="divide-y divide-neutral-200" data-testid="event-types">
        {sortableTypes.map((type, index) => (
          <li
            key={type.id}
            className={classNames(
              type.$disabled && "pointer-events-none cursor-not-allowed select-none opacity-30"
            )}
            data-disabled={type.$disabled ? 1 : 0}>
            <div
              className={classNames(
                "flex items-center justify-between hover:bg-neutral-50 ",
                type.$disabled && "pointer-events-none"
              )}>
              <div className="group flex w-full items-center justify-between px-4 py-4 hover:bg-neutral-50 sm:px-6">
                {sortableTypes.length > 1 && (
                  <>
                    <button
                      className="invisible absolute left-1/2 -mt-4 mb-4 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[19px] sm:ml-0 sm:block"
                      onClick={() => moveEventType(index, -1)}>
                      <ArrowUpIcon />
                    </button>

                    <button
                      className="invisible absolute left-1/2 mt-4 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[19px] sm:ml-0 sm:block"
                      onClick={() => moveEventType(index, 1)}>
                      <ArrowDownIcon />
                    </button>
                  </>
                )}
                <Link href={"/event-types/" + type.id}>
                  <a
                    className="flex-grow truncate text-sm"
                    title={`${type.title} ${type.description ? `– ${type.description}` : ""}`}>
                    <div>
                      <span className="truncate font-medium text-neutral-900">{type.title} </span>
                      <small className="hidden text-neutral-500 sm:inline">{`/${profile.slug}/${type.slug}`}</small>
                      {type.hidden && (
                        <span className="rtl:mr-2inline items-center rounded-sm bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800 ltr:ml-2">
                          {t("hidden")}
                        </span>
                      )}
                      {readOnly && (
                        <span className="rtl:mr-2inline items-center rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 ltr:ml-2">
                          {t("readonly")}
                        </span>
                      )}
                    </div>
                    <EventTypeDescription eventType={type} />
                  </a>
                </Link>

                <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 sm:flex">
                  <div className="flex justify-between rtl:space-x-reverse">
                    {type.users?.length > 1 && (
                      <AvatarGroup
                        border="border-2 border-white"
                        size={8}
                        truncateAfter={4}
                        items={type.users.map((organizer) => ({
                          alt: organizer.name || "",
                          image: `${process.env.NEXT_PUBLIC_APP_URL}/${organizer.username}/avatar.png`,
                        }))}
                      />
                    )}
                    <Tooltip content={t("preview")}>
                      <a
                        href={`${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-icon appearance-none">
                        <ExternalLinkIcon className="h-5 w-5 group-hover:text-black" />
                      </a>
                    </Tooltip>

                    <Tooltip content={t("copy_link")}>
                      <button
                        onClick={() => {
                          showToast(t("link_copied"), "success");
                          navigator.clipboard.writeText(
                            `${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`
                          );
                        }}
                        className="btn-icon">
                        <LinkIcon className="h-5 w-5 group-hover:text-black" />
                      </button>
                    </Tooltip>
                    <Dropdown>
                      <DropdownMenuTrigger className="h-[38px] w-[38px] cursor-pointer rounded-sm border border-transparent text-neutral-500 hover:border-gray-300 hover:text-neutral-900">
                        <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Link href={"/event-types/" + type.id} passHref={true}>
                            <Button
                              type="button"
                              color="minimal"
                              className="w-full font-normal"
                              StartIcon={PencilIcon}>
                              {" "}
                              {t("edit")}
                            </Button>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Button
                            type="button"
                            color="minimal"
                            className="w-full font-normal"
                            StartIcon={DuplicateIcon}
                            onClick={() => openModal(profile, type)}>
                            {t("duplicate")}
                          </Button>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="h-px bg-gray-200" />
                        <DropdownMenuItem>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                color="warn"
                                StartIcon={TrashIcon}
                                className="w-full font-normal">
                                {t("delete")}
                              </Button>
                            </DialogTrigger>
                            <ConfirmationDialogContent
                              variety="danger"
                              title={t("delete_event_type")}
                              confirmBtnText={t("confirm_delete_event_type")}
                              onConfirm={(e) => {
                                e.preventDefault();
                                deleteEventTypeHandler(type.id);
                              }}>
                              {t("delete_event_type_description")}
                            </ConfirmationDialogContent>
                          </Dialog>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </Dropdown>
                  </div>
                </div>
              </div>
              <div className="mr-5 flex flex-shrink-0 sm:hidden">
                <Menu as="div" className="inline-block text-left">
                  {({ open }) => (
                    <>
                      <div>
                        <Menu.Button className="mt-1 border border-transparent p-2 text-neutral-400 hover:border-gray-200">
                          <span className="sr-only">{t("open_options")}</span>
                          <DotsHorizontalIcon className="h-5 w-5" aria-hidden="true" />
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
                          className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-neutral-100 rounded-sm bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <a
                                  href={`${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={classNames(
                                    active ? "bg-neutral-100 text-neutral-900" : "text-neutral-700",
                                    "group flex items-center px-4 py-2 text-sm font-medium"
                                  )}>
                                  <ExternalLinkIcon
                                    className="mr-3 h-4 w-4 text-neutral-400 group-hover:text-neutral-500"
                                    aria-hidden="true"
                                  />
                                  {t("preview")}
                                </a>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      `${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`
                                    );
                                    showToast(t("link_copied"), "success");
                                  }}
                                  className={classNames(
                                    active ? "bg-neutral-100 text-neutral-900" : "text-neutral-700",
                                    "group flex w-full items-center px-4 py-2 text-sm font-medium"
                                  )}>
                                  <ClipboardCopyIcon
                                    className="mr-3 h-4 w-4 text-neutral-400 group-hover:text-neutral-500"
                                    aria-hidden="true"
                                  />
                                  {t("copy_link")}
                                </button>
                              )}
                            </Menu.Item>
                            {isNativeShare ? (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => {
                                      navigator
                                        .share({
                                          title: t("share"),
                                          text: t("share_event"),
                                          url: `${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}/${type.slug}`,
                                        })
                                        .then(() => showToast(t("link_shared"), "success"))
                                        .catch(() => showToast(t("failed"), "error"));
                                    }}
                                    className={classNames(
                                      active ? "bg-neutral-100 text-neutral-900" : "text-neutral-700",
                                      "group flex w-full items-center px-4 py-2 text-sm font-medium"
                                    )}>
                                    <UploadIcon
                                      className="mr-3 h-4 w-4 text-neutral-400 group-hover:text-neutral-500"
                                      aria-hidden="true"
                                    />
                                    {t("share")}
                                  </button>
                                )}
                              </Menu.Item>
                            ) : null}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </>
                  )}
                </Menu>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EventTypeList;
