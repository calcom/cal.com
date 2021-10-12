// TODO: replace headlessui with radix-ui
import { ChevronDownIcon, PlusIcon } from "@heroicons/react/solid";
import { SchedulingType } from "@prisma/client";
import { useRouter } from "next/router";
import React, { useRef } from "react";
import { useMutation } from "react-query";

import { HttpError } from "@lib/core/http/error";
import { useLocale } from "@lib/hooks/useLocale";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import createEventType from "@lib/mutations/event-types/create-event-type";
import showToast from "@lib/notification";
import { inferQueryOutput } from "@lib/trpc";
import { CreateEventType } from "@lib/types/event-type";

import { Dialog, DialogClose, DialogContent } from "@components/Dialog";
import Avatar from "@components/ui/Avatar";
import { Button } from "@components/ui/Button";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/Dropdown";
import * as RadioArea from "@components/ui/form/radio-area";

type Profiles = inferQueryOutput<"viewer.eventTypes">["profiles"];

const CreateNewEventDialog = ({ profiles, canAddEvents }: { profiles: Profiles; canAddEvents: boolean }) => {
  const router = useRouter();
  const teamId: number | null = Number(router.query.teamId) || null;
  const modalOpen = useToggleQuery("new");
  const { t } = useLocale();

  const createMutation = useMutation(createEventType, {
    onSuccess: async ({ eventType }) => {
      await router.push("/event-types/" + eventType.id);
      showToast(`${eventType.title} event type created successfully`, "success");
    },
    onError: (err: HttpError) => {
      const message = `${err.statusCode}: ${err.message}`;
      showToast(message, "error");
    },
  });

  const slugRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open={modalOpen.isOn}
      onOpenChange={(isOpen) => {
        router.push(isOpen ? modalOpen.hrefOn : modalOpen.hrefOff);
      }}>
      {!profiles.filter((profile) => profile.teamId).length && (
        <Button
          data-testid="new-event-type"
          {...(canAddEvents
            ? {
                href: modalOpen.hrefOn,
              }
            : {
                disabled: true,
              })}
          StartIcon={PlusIcon}>
          {t("new_event_type_btn")}
        </Button>
      )}
      {profiles.filter((profile) => profile.teamId).length > 0 && (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button EndIcon={ChevronDownIcon}>{t("new_event_type_btn")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("new_event_subtitle")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="h-px bg-gray-200" />
            {profiles.map((profile) => (
              <DropdownMenuItem
                key={profile.slug}
                className="px-3 py-2 cursor-pointer hover:bg-neutral-100 focus:outline-none"
                onSelect={() =>
                  router.push({
                    pathname: router.pathname,
                    query: {
                      ...router.query,
                      new: "1",
                      eventPage: profile.slug,
                      ...(profile.teamId
                        ? {
                            teamId: profile.teamId,
                          }
                        : {}),
                    },
                  })
                }>
                <Avatar alt={profile.name || ""} imageSrc={profile.image} size={6} className="inline mr-2" />
                {profile.name ? profile.name : profile.slug}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      )}
      <DialogContent>
        <div className="mb-8">
          <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
            {teamId ? t("add_new_team_event_type") : t("add_new_event_type")}
          </h3>
          <div>
            <p className="text-sm text-gray-500">{t("new_event_type_to_book_description")}</p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();

            const target = e.target as unknown as Record<
              "title" | "slug" | "description" | "length" | "schedulingType",
              { value: string }
            >;

            const payload: CreateEventType = {
              title: target.title.value,
              slug: target.slug.value,
              description: target.description.value,
              length: parseInt(target.length.value),
            };

            if (router.query.teamId) {
              payload.teamId = parseInt(`${router.query.teamId}`, 10);
              payload.schedulingType = target.schedulingType.value as SchedulingType;
            }

            createMutation.mutate(payload);
          }}>
          <div>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                {t("title")}
              </label>
              <div className="mt-1">
                <input
                  onChange={(e) => {
                    if (!slugRef.current) {
                      return;
                    }
                    slugRef.current.value = e.target.value.replace(/\s+/g, "-").toLowerCase();
                  }}
                  type="text"
                  name="title"
                  id="title"
                  required
                  className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  placeholder={t("quick_chat")}
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                {t("url")}
              </label>
              <div className="mt-1">
                <div className="flex rounded-sm shadow-sm">
                  <span className="inline-flex items-center px-3 text-gray-500 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 sm:text-sm">
                    {process.env.NEXT_PUBLIC_APP_URL}/{router.query.eventPage || profiles[0].slug}/
                  </span>
                  <input
                    ref={slugRef}
                    type="text"
                    name="slug"
                    id="slug"
                    required
                    className="flex-1 block w-full min-w-0 border-gray-300 rounded-none focus:ring-neutral-900 focus:border-neutral-900 rounded-r-md sm:text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                {t("description")}
              </label>
              <div className="mt-1">
                <textarea
                  name="description"
                  id="description"
                  className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  placeholder={t("quick_video_meeting")}
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                {t("length")}
              </label>
              <div className="relative mt-1 rounded-sm shadow-sm">
                <input
                  type="number"
                  name="length"
                  id="length"
                  required
                  className="block w-full pr-20 border-gray-300 rounded-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  placeholder="15"
                  defaultValue={15}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-400">
                  {t("minutes")}
                </div>
              </div>
            </div>
          </div>
          {teamId && (
            <div className="mb-4">
              <label htmlFor="schedulingType" className="block text-sm font-medium text-gray-700">
                {t("scheduling_type")}
              </label>
              <RadioArea.Group
                name="schedulingType"
                className="relative flex mt-1 space-x-6 rounded-sm shadow-sm">
                <RadioArea.Item value={SchedulingType.COLLECTIVE} className="w-1/2 text-sm">
                  <strong className="block mb-1">{t("collective")}</strong>
                  <p>{t("collective_description")}</p>
                </RadioArea.Item>
                <RadioArea.Item value={SchedulingType.ROUND_ROBIN} className="w-1/2 text-sm">
                  <strong className="block mb-1">{t("round_robin")}</strong>
                  <p>{t("round_robin_description")}</p>
                </RadioArea.Item>
              </RadioArea.Group>
            </div>
          )}
          <div className="mt-8 sm:flex sm:flex-row-reverse gap-x-2">
            <Button type="submit" loading={createMutation.isLoading}>
              {t("continue")}
            </Button>
            <DialogClose asChild>
              <Button color="secondary">{t("cancel")}</Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateNewEventDialog;
