import { ChevronDownIcon, PlusIcon } from "@heroicons/react/solid";
import { SchedulingType } from "@prisma/client";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "react-query";

import { HttpError } from "@lib/core/http/error";
import { useLocale } from "@lib/hooks/useLocale";
import { useToggleQuery } from "@lib/hooks/useToggleQuery";
import createEventType from "@lib/mutations/event-types/create-event-type";
import showToast from "@lib/notification";
import { CreateEventType } from "@lib/types/event-type";

import { Dialog, DialogClose, DialogContent } from "@components/Dialog";
import { TextField, InputLeading, TextAreaField, Form } from "@components/form/fields";
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

// this describes the uniform data needed to create a new event type on Profile or Team
interface EventTypeParent {
  teamId: number | null | undefined; // if undefined, then it's a profile
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

interface Props {
  // set true for use on the team settings page
  canAddEvents: boolean;
  // set true when in use on the team settings page
  isIndividualTeam?: boolean;
  // EventTypeParent can be a profile (as first option) or a team for the rest.
  options: EventTypeParent[];
}

export default function CreateEventTypeButton(props: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const modalOpen = useToggleQuery("new");

  const form = useForm<CreateEventType>({
    defaultValues: { length: 15 },
  });
  const { setValue, watch, register } = form;

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name === "title" && type === "change") {
        if (value.title) setValue("slug", value.title.replace(/\s+/g, "-").toLowerCase());
        else setValue("slug", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  // URL encoded params
  const teamId: number | null = Number(router.query.teamId) || null;
  const pageSlug = router.query.eventPage || props.options[0].slug;

  const hasTeams = !!props.options.find((option) => option.teamId);

  const createMutation = useMutation(createEventType, {
    onSuccess: async ({ eventType }) => {
      await router.push("/event-types/" + eventType.id);
      showToast(t("event_type_created_successfully", { eventTypeTitle: eventType.title }), "success");
    },
    onError: (err: HttpError) => {
      const message = `${err.statusCode}: ${err.message}`;
      showToast(message, "error");
    },
  });

  // inject selection data into url for correct router history
  const openModal = (option: EventTypeParent) => {
    // setTimeout fixes a bug where the url query params are removed immediately after opening the modal
    setTimeout(() => {
      router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          new: "1",
          eventPage: option.slug,
          ...(option.teamId
            ? {
                teamId: option.teamId,
              }
            : {}),
        },
      });
    });
  };

  // remove url params after close modal to reset state
  const closeModal = () => {
    router.replace({
      pathname: router.pathname,
      query: { id: router.query.id },
    });
  };

  return (
    <Dialog
      open={modalOpen.isOn}
      onOpenChange={(isOpen) => {
        if (!isOpen) closeModal();
      }}>
      {!hasTeams || props.isIndividualTeam ? (
        <Button
          onClick={() => openModal(props.options[0])}
          data-testid="new-event-type"
          StartIcon={PlusIcon}
          {...(props.canAddEvents
            ? {
                href: modalOpen.hrefOn,
              }
            : {
                disabled: true,
              })}>
          {t("new_event_type_btn")}
        </Button>
      ) : (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button EndIcon={ChevronDownIcon}>{t("new_event_type_btn")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("new_event_subtitle")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="h-px bg-gray-200" />
            {props.options.map((option) => (
              <DropdownMenuItem
                key={option.slug}
                className="px-3 py-2 cursor-pointer hover:bg-neutral-100 focus:outline-none"
                onSelect={() => openModal(option)}>
                <Avatar alt={option.name || ""} imageSrc={option.image} size={6} className="inline mr-2" />
                {option.name ? option.name : option.slug}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      )}

      <DialogContent>
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
            const payload: CreateEventType = {
              title: values.title,
              slug: values.slug,
              description: values.description,
              length: values.length,
            };
            if (router.query.teamId) {
              payload.teamId = parseInt(`${router.query.teamId}`, 10);
              payload.schedulingType = values.schedulingType as SchedulingType;
            }

            createMutation.mutate(payload);
          }}>
          <div className="mt-3 space-y-4">
            <TextField label={t("title")} placeholder={t("quick_chat")} {...register("title")} />

            <TextField
              label={t("url")}
              required
              addOnLeading={
                <InputLeading>
                  {process.env.NEXT_PUBLIC_APP_URL}/{pageSlug}/
                </InputLeading>
              }
              {...register("slug")}
            />

            <TextAreaField
              label={t("description")}
              placeholder={t("quick_video_meeting")}
              {...register("description")}
            />

            <div className="relative">
              <TextField
                type="number"
                required
                placeholder="15"
                defaultValue={15}
                label={t("length")}
                className="pr-20"
                {...register("length")}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pt-4 mt-1.5 pr-3 text-sm text-gray-400">
                {t("minutes")}
              </div>
            </div>

            {teamId && (
              <div className="mb-4">
                <label htmlFor="schedulingType" className="block text-sm font-bold text-gray-700">
                  {t("scheduling_type")}
                </label>
                <RadioArea.Group
                  {...register("schedulingType")}
                  onChange={(val) => form.setValue("schedulingType", val as SchedulingType)}
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
          </div>
          <div className="flex flex-row-reverse mt-8 gap-x-2">
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
