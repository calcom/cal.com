import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";

import { useTimePreferences } from "@calcom/features/bookings/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Skeleton, TextField, TimezoneSelect, Label, Button, Divider } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

const BackButtonInSidebar = ({ name }: { name: string }) => {
  return (
    <Link
      href="/event-types"
      className="hover:bg-subtle group-hover:text-default text-emphasis group flex h-6 max-h-6 w-full flex-row items-center rounded-md py-2 pr-3">
      <ArrowLeft className="h-4 w-4 stroke-[2px] ltr:mr-[10px] rtl:ml-[10px] rtl:rotate-180 md:mt-0" />
      <Skeleton
        title={name}
        as="p"
        className="max-w-36 min-h-4 truncate font-semibold"
        loadingClassName="ms-3">
        {name}
      </Skeleton>
    </Link>
  );
};

const formSchema = z.object({
  title: z.string(),
  description: z.string(),
  timeZone: z.string(),
  duration: z.number(),
  reserveTimeSlots: z.boolean(),
});

type formSchemaType = z.infer<typeof formSchema>;

const SideBar = () => {
  const { t } = useLocale();
  const { timezone } = useTimePreferences();

  const formMethods = useForm<formSchemaType>({
    mode: "onChange",
    defaultValues: {
      timeZone: timezone,
      duration: 15,
      reserveTimeSlots: false,
    },
    resolver: zodResolver(formSchema),
  });

  return (
    <div className="relative z-10 hidden h-screen w-full flex-col gap-6 overflow-y-scroll py-6 pl-4 pr-6 sm:flex md:pl-0">
      <BackButtonInSidebar name={t("back")} />
      <div>
        <p className="text-emphasis font-cal text-xl font-semibold">{t("one_time_link")}</p>
        <p className="text-subtle mt-2 font-normal">{t("one_time_link_description")}</p>
      </div>
      <div className="space-y-6">
        <TextField required label={t("title")} {...formMethods.register("title")} />
        <TextField required label={t("description")} {...formMethods.register("description")} />
        <TextField
          required
          type="number"
          label={t("duration")}
          {...formMethods.register("duration")}
          addOnSuffix={<>{t("minutes")}</>}
          min={1}
        />
        <Controller
          name="timeZone"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <div>
              <Label className="text-emphasis">
                <>{t("timezone")}</>
              </Label>
              <TimezoneSelect
                id="timezone"
                value={value}
                onChange={(event) => {
                  if (event) formMethods.setValue("timeZone", event.value, { shouldDirty: true });
                }}
              />
            </div>
          )}
        />
        <div>
          <Label className="text-emphasis">
            <>{t("availability")}</>
          </Label>
          <Button color="secondary" StartIcon={Plus}>
            {t("add_schedule")}
          </Button>
        </div>

        <div>
          <Label className="text-emphasis">
            <>{t("location")}</>
          </Label>
        </div>

        <Divider />

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            className="text-emphasis focus:ring-emphasis dark:text-muted border-default bg-default h-4 w-4 rounded"
          />
          <div>
            <p className="text-sm font-semibold leading-none">{t("reserve_times")}</p>
            <p className="text-subtle">{t("put_placeholder_on_calendar  ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideBar;
