import classNames from "@calcom/lib/classNames";
import { LOGO_ICON, LOGO } from "@calcom/lib/constants";

export default function Logo({ small, icon }: { small?: boolean; icon?: boolean }) {
  return (
    <h3 className="logo inline ">
      <strong>
        {icon ? (
          <img className="mx-auto w-9 dark:invert" alt="Cal" title="Cal" src={LOGO_ICON} />
        ) : (
          <img
            className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
            alt="Cal"
            title="Cal"
            src={LOGO}
          />
        )}
      </strong>
    </h3>
  );
}
