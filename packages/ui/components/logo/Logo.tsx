import { LOGO_ICON, LOGO } from "@calcom/lib/constants";

export default function Logo({ small, icon }: { small?: boolean; icon?: boolean }) {
  return (
    <h3 className="logo inline">
      <strong>
        {icon ? (
          <img className="mx-auto w-14" alt="Mento" title="Mento" src={LOGO_ICON} />
        ) : (
          <img className={small ? "h-8 w-auto" : "h-12 w-auto"} alt="Mento" title="Mento" src={LOGO} />
        )}
      </strong>
    </h3>
  );
}
