import {
  FilterCheckboxFieldsContainer,
  FilterCheckboxField,
} from "@calcom/features/filters/components/TeamsFilter";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, AnimatedPopover } from "@calcom/ui";
import { Layers, Clock } from "@calcom/ui/components/icon";

const Header = () => {
  const { t, i18n } = useLocale();

  return (
    <div className="border-default relative z-10 flex border-b px-5 py-4 ltr:border-l rtl:border-r">
      <div className="flex w-full items-center justify-between">
        <div>{t("select_timeslots_to_make_available")}</div>

        <div className="flex items-center gap-2">
          <SelectedSlots />
          <Button color="primary">{t("confirm")}</Button>
        </div>
      </div>
    </div>
  );
};

const SelectedSlots = () => {
  const { t } = useLocale();
  const numberOfSelectedSlots = 0;
  return (
    <AnimatedPopover
      text={t("number_slots_selected", { count: numberOfSelectedSlots })}
      prefix=""
      popoverTriggerClassNames="mb-0 max-w-84"
      StartIcon={Clock}>
      <FilterCheckboxFieldsContainer>
        <FilterCheckboxField
          id="all"
          icon={<Layers className="h-4 w-4" />}
          checked={false}
          onChange={() => {
            console.log("all");
          }}
          label={t("all")}
        />
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};

export default Header;
