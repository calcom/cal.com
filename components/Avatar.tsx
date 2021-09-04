import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as Tooltip from "@radix-ui/react-tooltip";
import { defaultAvatarSrc } from "@lib/profile";
import classNames from "@lib/classNames";

export type AvatarProps = {
  className?: string;
  imageSrc?: string;
  displayName: string;
  gravatarFallbackMd5?: string;
  tooltipDisabled?: boolean;
};

export default function Avatar({
  imageSrc,
  displayName,
  gravatarFallbackMd5,
  className,
  tooltipDisabled,
}: AvatarProps) {
  className = classNames("border-2 border-gray-300 rounded-full", className);

  const avatar = (
    <AvatarPrimitive.Root>
      <AvatarPrimitive.Image src={imageSrc} alt={displayName} className={className} />
      <AvatarPrimitive.Fallback delayMs={600}>
        {gravatarFallbackMd5 && (
          <img src={defaultAvatarSrc({ md5: gravatarFallbackMd5 })} alt={displayName} className={className} />
        )}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );

  return tooltipDisabled ? (
    <>{avatar}</>
  ) : (
    <Tooltip.Tooltip delayDuration="300">
      <Tooltip.TooltipTrigger className="cursor-default">{avatar}</Tooltip.TooltipTrigger>
      <Tooltip.Content className="p-2 rounded-sm text-sm bg-black text-white shadow-sm">
        <Tooltip.Arrow />
        {displayName}
      </Tooltip.Content>
    </Tooltip.Tooltip>
  );
}
