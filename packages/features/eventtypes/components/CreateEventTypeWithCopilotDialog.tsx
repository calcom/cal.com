import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import type { MembershipRole } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import { createEventTypeWithCopilotInput } from "@calcom/prisma/zod/custom/eventtype";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  Form,
  showToast,
  Editor,
  DialogFooter,
} from "@calcom/ui";

// this describes the uniform data needed to create a new event type on Profile or Team
export interface EventTypeParent {
  teamId: number | null | undefined; // if undefined, then it's a profile
  membershipRole?: MembershipRole | null;
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

const locationFormSchema = z.array(
  z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
    locationLink: z.string().url().optional(), // URL validates as new URL() - which requires HTTPS:// In the input field
  })
);

const querySchema = z.object({
  eventPage: z.string().optional(),
  teamId: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  description: z.string().optional(),
  schedulingType: z.nativeEnum(SchedulingType).optional(),
  locations: z
    .string()
    .transform((jsonString) => locationFormSchema.parse(JSON.parse(jsonString)))
    .optional(),
});

export default function CreateEventTypeWithCopilotDialog(props: any) {
  const { t } = useLocale();
  const [firstRender, setFirstRender] = useState(true);

  const {
    data: { teamId },
  } = useTypedQuery(querySchema);

  const aboutMePlaceholder = `I'm a co-founder of a SaaS startup called Cal.com, and our mission is to connect a billion people by 2031 through calendar scheduling.`;
  const peoplePlaceholder = `I'm looking to connect with other founders, investors, enterprise executives, friends, and anyone else who wants to help us achieve our mission.`;

  const form = useForm<z.infer<typeof createEventTypeWithCopilotInput>>({
    resolver: zodResolver(createEventTypeWithCopilotInput),
  });

  const createCopilotSuggestionMutation = trpc.viewer.eventTypes.createCopilotSuggestion.useMutation({
    onSuccess: async (responseData) => {
      console.log(responseData);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "BAD_REQUEST") {
        const message = `${err.data.code}: ${t("error_event_type_url_duplicate")}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("error_event_type_unauthorized_create")}`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Dialog
      key="new-copilot"
      name="new-copilot"
      clearQueryParamsOnClose={[
        "eventPage",
        "teamId",
        "type",
        "description",
        "title",
        "length",
        "slug",
        "locations",
      ]}>
      <DialogContent
        type="creation"
        enableOverflow
        title={teamId ? t("add_new_team_event_type") : t("add_new_event_type")}
        description={t("new_event_type_to_book_description")}>
        <Form
          form={form}
          handleSubmit={(values) => {
            createCopilotSuggestionMutation.mutate(values);
          }}>
          <div className="mt-3 space-y-6 pb-11">
            <div className="relative">
              <label className="text-emphasis mb-2 block text-sm font-medium">Who are you?</label>
              <Editor
                getText={() => md.render(form.getValues("aboutMe") || "")}
                setText={(value: string) => form.setValue("aboutMe", turndown(value))}
                excludedToolbarItems={["blockType", "link"]}
                placeholder={aboutMePlaceholder}
                firstRender={firstRender}
                setFirstRender={setFirstRender}
              />
            </div>
            <div className="relative">
              <label className="text-emphasis mb-2 block text-sm font-medium">
                Who are you looking to connect with?
              </label>
              <Editor
                getText={() => md.render(form.getValues("aboutPeopleToMeet") || "")}
                setText={(value: string) => form.setValue("aboutPeopleToMeet", turndown(value))}
                excludedToolbarItems={["blockType", "link"]}
                placeholder={peoplePlaceholder}
                firstRender={firstRender}
                setFirstRender={setFirstRender}
              />
            </div>
          </div>
          <DialogFooter showDivider>
            <DialogClose />
            <Button type="submit" loading={createCopilotSuggestionMutation.isLoading}>
              {t("continue")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
