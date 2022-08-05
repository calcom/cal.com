import { zodResolver } from "@hookform/resolvers/zod";
import { SchedulingType } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import classNames from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/Alert";
import { Button } from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent } from "@calcom/ui/Dialog";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/Dropdown";
import { Icon } from "@calcom/ui/Icon";
import { Form, InputLeading, TextAreaField, TextField } from "@calcom/ui/form/fields";

import { HttpError } from "@lib/core/http/error";
import { slugify } from "@lib/slugify";

import Avatar from "@components/ui/Avatar";
import * as RadioArea from "@components/ui/form/radio-area";

// this describes the uniform data needed to create a new event type on Profile or Team
export interface EventTypeParent {
  teamId: number | null | undefined; // if undefined, then it's a profile
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

interface CreateEventTypeBtnProps {
  // set true for use on the team settings page
  canAddEvents: boolean;
  // set true when in use on the team settings page
  isIndividualTeam?: boolean;
  // EventTypeParent can be a profile (as first option) or a team for the rest.
  options: EventTypeParent[];
}

export default function CreateEventTypeButton(props: CreateEventTypeBtnProps) {
  const { t } = useLocale();
  const router = useRouter();

  // URL encoded params
  const teamId: number | undefined =
    typeof router.query.teamId === "string" && router.query.teamId
      ? parseInt(router.query.teamId)
      : undefined;
  const pageSlug = router.query.eventPage || props.options[0].slug;
  const hasTeams = !!props.options.find((option) => option.teamId);
  const type: string = typeof router.query.type == "string" && router.query.type ? router.query.type : "";

  const form = useForm<z.infer<typeof createEventTypeInput>>({
    resolver: zodResolver(createEventTypeInput),
  });
  const { setValue, watch, register } = form;

  useEffect(() => {
    if (!router.isReady) return;

    const title: string =
      typeof router.query.title === "string" && router.query.title ? router.query.title : "";
    const length: number =
      typeof router.query.length === "string" && router.query.length ? parseInt(router.query.length) : 15;
    const description: string =
      typeof router.query.description === "string" && router.query.description
        ? router.query.description
        : "";
    const slug: string = typeof router.query.slug === "string" && router.query.slug ? router.query.slug : "";

    setValue("title", title);
    setValue("length", length);
    setValue("description", description);
    setValue("slug", slug);
    // If query params change, update the form
  }, [router.isReady, router.query, setValue]);

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name === "title" && type === "change") {
        if (value.title) setValue("slug", slugify(value.title));
        else setValue("slug", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  const createMutation = trpc.useMutation("viewer.eventTypes.create", {
    onSuccess: async ({ eventType }) => {
      await router.replace("/event-types/" + eventType.id);
      showToast(t("event_type_created_successfully", { eventTypeTitle: eventType.title }), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "BAD_REQUEST") {
        const message = `${err.data.code}: URL already exists.`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not able to create this event`;
        showToast(message, "error");
      }
    },
  });

  // inject selection data into url for correct router history
  const openModal = (option: EventTypeParent) => {
    const query = {
      ...router.query,
      dialog: "new-eventtype",
      eventPage: option.slug,
      teamId: option.teamId,
    };
    if (!option.teamId) {
      delete query.teamId;
    }
    router.push(
      {
        pathname: router.pathname,
        query,
      },
      undefined,
      { shallow: true }
    );
  };

  return (
    <Dialog
      name="new-eventtype"
      clearQueryParamsOnClose={["eventPage", "teamId", "type", "description", "title", "length", "slug"]}>
      <CreateEventTypeTrigger
        hasTeams={hasTeams}
        canAddEvents={props.canAddEvents}
        isIndividualTeam={props.isIndividualTeam}
        openModal={openModal}
        options={props.options}
      />

      <DialogContent className="overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
            {teamId ? t("add_new_team_event_type") : t("add_new_event_type")}
          </h3>
          <div>
            <p className="text-sm text-gray-500">{t("new_event_type_to_book_description")}</p>
          </div>
        </div>
        <Form
          form={form}
          handleSubmit={(values) => {
            createMutation.mutate(values);
          }}>
          <div className="mt-3 space-y-4">
            {teamId && (
              <TextField
                type="hidden"
                labelProps={{ style: { display: "none" } }}
                {...register("teamId", { valueAsNumber: true })}
                value={teamId}
              />
            )}
            <TextField label={t("title")} placeholder={t("quick_chat")} {...register("title")} />

            {process.env.NEXT_PUBLIC_WEBSITE_URL !== undefined &&
            process.env.NEXT_PUBLIC_WEBSITE_URL?.length >= 21 ? (
              <TextField
                label={`${t("url")}: ${process.env.NEXT_PUBLIC_WEBSITE_URL}`}
                required
                addOnLeading={<InputLeading>/{pageSlug}/</InputLeading>}
                {...register("slug")}
              />
            ) : (
              <TextField
                label={t("url")}
                required
                addOnLeading={
                  <InputLeading>
                    {process.env.NEXT_PUBLIC_WEBSITE_URL}/{pageSlug}/
                  </InputLeading>
                }
                {...register("slug")}
              />
            )}

            <TextAreaField
              label={t("description")}
              placeholder={t("quick_video_meeting")}
              {...register("description")}
            />

            <div className="relative">
              <TextField
                type="number"
                required
                min="10"
                placeholder="15"
                label={t("length")}
                className="pr-20"
                {...register("length", { valueAsNumber: true })}
              />
              <div className="absolute inset-y-0 right-0 mt-1.5 flex items-center pt-4 pr-3 text-sm text-gray-400">
                {t("minutes")}
              </div>
            </div>

            {teamId && (
              <div className="mb-4">
                <label htmlFor="schedulingType" className="block text-sm font-bold text-gray-700">
                  {t("scheduling_type")}
                </label>
                {form.formState.errors.schedulingType && (
                  <Alert
                    className="mt-1"
                    severity="error"
                    message={form.formState.errors.schedulingType.message}
                  />
                )}
                <RadioArea.Group
                  {...register("schedulingType")}
                  onChange={(val) => form.setValue("schedulingType", val as SchedulingType)}
                  className="relative mt-1 flex space-x-6 rounded-sm rtl:space-x-reverse">
                  <RadioArea.Item
                    value={SchedulingType.COLLECTIVE}
                    defaultChecked={type === SchedulingType.COLLECTIVE}
                    className="w-1/2 text-sm">
                    <strong className="mb-1 block">{t("collective")}</strong>
                    <p>{t("collective_description")}</p>
                  </RadioArea.Item>
                  <RadioArea.Item
                    value={SchedulingType.ROUND_ROBIN}
                    defaultChecked={type === SchedulingType.ROUND_ROBIN}
                    className="w-1/2 text-sm">
                    <strong className="mb-1 block">{t("round_robin")}</strong>
                    <p>{t("round_robin_description")}</p>
                  </RadioArea.Item>
                </RadioArea.Group>
              </div>
            )}
          </div>
          <div className="mt-8 flex flex-row-reverse gap-x-2">
            <Button type="submit" loading={createMutation.isLoading}>
              {t("continue")}
            </Button>
            <DialogClose asChild>
              <Button color="secondary">{t("cancel")}</Button>
            </DialogClose>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type CreateEventTypeTrigger = {
  isIndividualTeam?: boolean;
  // EventTypeParent can be a profile (as first option) or a team for the rest.
  options: EventTypeParent[];
  hasTeams: boolean;
  // set true for use on the team settings page
  canAddEvents: boolean;
  openModal: (option: EventTypeParent) => void;
};

export function CreateEventTypeTrigger(props: CreateEventTypeTrigger) {
  const { t } = useLocale();

  return (
    <>
      {!props.hasTeams || props.isIndividualTeam ? (
        <Button
          onClick={() => props.openModal(props.options[0])}
          data-testid="new-event-type"
          StartIcon={Icon.FiPlus}
          disabled={!props.canAddEvents}>
          {t("new_event_type_btn")}
        </Button>
      ) : (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button EndIcon={Icon.FiChevronDown}>{t("new_event_type_btn")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("new_event_subtitle")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="h-px bg-gray-200" />
            {props.options.map((option) => (
              <CreateEventTeamsItem
                key={option.slug}
                option={option}
                openModal={() => props.openModal(option)}
              />
            ))}
          </DropdownMenuContent>
        </Dropdown>
      )}
    </>
  );
}

function CreateEventTeamsItem(props: {
  openModal: (option: EventTypeParent) => void;
  option: EventTypeParent;
}) {
  const session = useSession();
  const membershipQuery = trpc.useQuery([
    "viewer.teams.getMembershipbyUser",
    {
      memberId: session.data?.user.id as number,
      teamId: props.option.teamId as number,
    },
  ]);

  const isDisabled = membershipQuery.data?.role === "MEMBER";

  return (
    <DropdownMenuItem
      key={props.option.slug}
      className={classNames(
        "cursor-pointer px-3 py-2  focus:outline-none",
        isDisabled ? "cursor-default !text-gray-300" : "hover:bg-neutral-100"
      )}
      disabled={isDisabled}
      onSelect={() => props.openModal(props.option)}>
      <Avatar
        alt={props.option.name || ""}
        imageSrc={props.option.image}
        size={6}
        className="inline ltr:mr-2 rtl:ml-2"
      />
      {props.option.name ? props.option.name : props.option.slug}
    </DropdownMenuItem>
  );
}
