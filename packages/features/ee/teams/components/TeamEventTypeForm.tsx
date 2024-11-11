import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useIsPlatform } from "@calcom/atoms/monorepo";
import { classNames } from "@calcom/lib";
import type { CreateEventTypeFormValues } from "@calcom/lib/hooks/useCreateEventType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { SchedulingType } from "@calcom/prisma/enums";
import { Form, TextField, Tooltip } from "@calcom/ui";
import { Alert, RadioGroup as RadioArea } from "@calcom/ui";

type props = {
  isTeamAdminOrOwner: boolean;
  teamSlug?: string | null;
  teamId: number;
  isPending: boolean;
  urlPrefix?: string;
  form: UseFormReturn<CreateEventTypeFormValues>;
  handleSubmit: (values: CreateEventTypeFormValues) => void;
  isManagedEventType: boolean;
  SubmitButton: (isPending: boolean) => ReactNode;
};
export const TeamEventTypeForm = ({
  isTeamAdminOrOwner,
  teamSlug,
  teamId,
  form,
  urlPrefix,
  isPending,
  handleSubmit,
  isManagedEventType,
  SubmitButton,
}: props) => {
  const isPlatform = useIsPlatform();

  const { t } = useLocale();

  const { register, setValue, formState } = form;

  return (
    <Form form={form} handleSubmit={handleSubmit}>
      <div className="mt-3 space-y-6 pb-11">
        <TextField
          type="hidden"
          labelProps={{ style: { display: "none" } }}
          {...register("teamId", { valueAsNumber: true })}
          value={teamId}
        />
        <TextField
          label={t("title")}
          placeholder={t("quick_chat")}
          data-testid="event-type-quick-chat"
          {...register("title")}
          onChange={(e) => {
            form.setValue("title", e?.target.value);
            if (formState.touchedFields["slug"] === undefined) {
              form.setValue("slug", slugify(e?.target.value));
            }
          }}
        />
        {urlPrefix && urlPrefix.length >= 21 ? (
          <div>
            <TextField
              label={isPlatform ? "Slug" : `${t("url")}: ${urlPrefix}`}
              required
              addOnLeading={
                !isPlatform ? (
                  <Tooltip content={!isManagedEventType ? `team/${teamSlug}` : t("username_placeholder")}>
                    <span className="max-w-24 md:max-w-56">
                      /{!isManagedEventType ? `team/${teamSlug}` : t("username_placeholder")}/
                    </span>
                  </Tooltip>
                ) : undefined
              }
              {...register("slug")}
              onChange={(e) => {
                form.setValue("slug", slugify(e?.target.value), { shouldTouch: true });
              }}
            />

            {isManagedEventType && !isPlatform && (
              <p className="mt-2 text-sm text-gray-600">{t("managed_event_url_clarification")}</p>
            )}
          </div>
        ) : (
          <div>
            <TextField
              label={isPlatform ? "Slug" : t("url")}
              required
              addOnLeading={
                !isPlatform ? (
                  <Tooltip
                    content={`${urlPrefix}/${
                      !isManagedEventType ? `team/${teamSlug}` : t("username_placeholder")
                    }/`}>
                    <span className="max-w-24 md:max-w-56">
                      {urlPrefix}/{!isManagedEventType ? `team/${teamSlug}` : t("username_placeholder")}/
                    </span>
                  </Tooltip>
                ) : undefined
              }
              {...register("slug")}
              onChange={(e) => {
                form.setValue("slug", slugify(e?.target.value), { shouldTouch: true });
              }}
            />
            {isManagedEventType && !isPlatform && (
              <p className="mt-2 text-sm text-gray-600">{t("managed_event_url_clarification")}</p>
            )}
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="schedulingType" className="text-default block text-sm font-bold">
            {t("assignment")}
          </label>
          {formState.errors.schedulingType && (
            <Alert className="mt-1" severity="error" message={formState.errors.schedulingType.message} />
          )}
          <RadioArea.Group
            onValueChange={(val: SchedulingType) => {
              setValue("schedulingType", val);
            }}
            className={classNames("mt-1 flex gap-4", isTeamAdminOrOwner && "flex-col")}>
            <RadioArea.Item
              {...register("schedulingType")}
              value={SchedulingType.COLLECTIVE}
              className={classNames("w-full text-sm", !isTeamAdminOrOwner && "w-1/2")}
              classNames={{ container: classNames(isTeamAdminOrOwner && "w-full") }}>
              <strong className="mb-1 block">{t("collective")}</strong>
              <p>{t("collective_description")}</p>
            </RadioArea.Item>
            <RadioArea.Item
              {...register("schedulingType")}
              value={SchedulingType.ROUND_ROBIN}
              className={classNames("text-sm", !isTeamAdminOrOwner && "w-1/2")}
              classNames={{ container: classNames(isTeamAdminOrOwner && "w-full") }}>
              <strong className="mb-1 block">{t("round_robin")}</strong>
              <p>{t("round_robin_description")}</p>
            </RadioArea.Item>
            {isTeamAdminOrOwner && (
              <RadioArea.Item
                {...register("schedulingType")}
                value={SchedulingType.MANAGED}
                className={classNames("text-sm", !isTeamAdminOrOwner && "w-1/2")}
                classNames={{ container: classNames(isTeamAdminOrOwner && "w-full") }}
                data-testid="managed-event-type">
                <strong className="mb-1 block">{t("managed_event")}</strong>
                <p>{t("managed_event_description")}</p>
              </RadioArea.Item>
            )}
          </RadioArea.Group>
        </div>
      </div>
      {SubmitButton(isPending)}
    </Form>
  );
};
