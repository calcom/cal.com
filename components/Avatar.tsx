import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as Tooltip from "@radix-ui/react-tooltip";
import { defaultAvatarSrc } from "@lib/profile";
import classNames from "@lib/classNames";

export type AvatarProps = {
  className?: string;
  size: number;
  imageSrc?: string;
  displayName: string;
  gravatarFallbackMd5?: string;
  tooltip?: boolean;
};

export default function Avatar({
  imageSrc,
  displayName,
  gravatarFallbackMd5,
  size,
  tooltip = false,
  ...props
}: AvatarProps) {
  const className = classNames(
    "border-2 border-gray-300 rounded-full",
    props.className,
    `h-${size} w-${size}`
  );
  const avatar = (
    <AvatarPrimitive.Root>
      <AvatarPrimitive.Image
        src={imageSrc}
        alt={displayName}
        className={classNames(
          "border-2 border-gray-300 rounded-full",
          `h-${size} w-${size}`,
          props.className
        )}
      />
      <AvatarPrimitive.Fallback delayMs={600}>
        {gravatarFallbackMd5 && (
          <img src={defaultAvatarSrc({ md5: gravatarFallbackMd5 })} alt={displayName} className={className} />
        )}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );

  return tooltip ? (
    <Tooltip.Tooltip delayDuration="300">
      <Tooltip.TooltipTrigger className="cursor-default">{avatar}</Tooltip.TooltipTrigger>
      <Tooltip.Content className="p-2 rounded-sm text-sm bg-black text-white shadow-sm">
        <Tooltip.Arrow />
        {displayName}
      </Tooltip.Content>
    </Tooltip.Tooltip>
  ) : (
    <>{avatar}</>
  );
}
