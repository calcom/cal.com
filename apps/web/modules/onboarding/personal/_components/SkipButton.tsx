import { useLocale } from "@calcom/lib/hooks/useLocale";

type SkipButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export const SkipButton = ({ onClick, disabled }: SkipButtonProps) => {
  const { t } = useLocale();

  return (
    <div className="flex w-full justify-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className="text-subtle hover:bg-subtle rounded-[10px] px-2 py-1.5 text-sm font-medium leading-4 disabled:opacity-50">
        {t("ill_do_this_later")}
      </button>
    </div>
  );
};
