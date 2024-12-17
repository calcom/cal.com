import type { IconName } from "@calcom/ui";
import { Badge, Icon } from "@calcom/ui";

type DisplayInfoType = {
  label: string;
  icon?: IconName;
  value: string | string[];
  coloredBadges?: boolean;
  labelClassname?: string;
  valueClassname?: string;
};

const badgeColors = ["warning", "success", "green", "gray", "blue", "red", "error"] as const;

const valueDefaultClassname = "text-emphasis inline-flex items-center gap-1 font-medium leading-5";

export function DisplayInfo({
  label,
  icon,
  value,
  coloredBadges,
  labelClassname,
  valueClassname = valueDefaultClassname,
}: DisplayInfoType) {
  const displayAsBadges = Array.isArray(value);

  return (
    <div className="flex items-center gap-6">
      <div className="flex w-[110px] items-center gap-2">
        {icon ? <Icon className="text-subtle h-4 w-4" name={icon} /> : null}
        <label className={labelClassname ? labelClassname : "text-subtle text-sm font-medium"}>{label}</label>
      </div>
      <div className="flex flex-1">
        {displayAsBadges ? (
          <div className="flex flex-wrap gap-2">
            {value.map((v, idx) => {
              return coloredBadges ? (
                <Badge variant={badgeColors[idx % badgeColors.length]} key={v}>
                  {v}
                </Badge>
              ) : (
                <Badge variant="gray">{v}</Badge>
              );
            })}
          </div>
        ) : (
          <span className={valueClassname}>{value}</span>
        )}
      </div>
    </div>
  );
}
