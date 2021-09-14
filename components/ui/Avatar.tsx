import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as Tooltip from "@radix-ui/react-tooltip";
import { defaultAvatarSrc } from "@lib/profile";
import classNames from "@lib/classNames";

export type AvatarProps = {
  className?: string;
  size: number;
  imageSrc?: string;
  title?: string;
  alt: string;
  gravatarFallbackMd5?: string;
};

export default function Avatar({ imageSrc, gravatarFallbackMd5, size, alt, title, ...props }: AvatarProps) {
  const className = classNames("rounded-full", props.className, `h-${size} w-${size}`);
  const avatar = (
    <AvatarPrimitive.Root>
      <AvatarPrimitive.Image
        src={imageSrc}
        alt={alt}
        className={classNames("rounded-full", `h-auto w-${size}`, props.className)}
      />
      <AvatarPrimitive.Fallback delayMs={600}>
        {gravatarFallbackMd5 && (
          <img src={defaultAvatarSrc({ md5: gravatarFallbackMd5 })} alt={alt} className={className} />
        )}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );

  return title ? (
    <Tooltip.Tooltip delayDuration={300}>
      <Tooltip.TooltipTrigger className="cursor-default">{avatar}</Tooltip.TooltipTrigger>
      <Tooltip.Content className="p-2 rounded-sm text-sm bg-black text-white shadow-sm">
        <Tooltip.Arrow />
        {title}
      </Tooltip.Content>
    </Tooltip.Tooltip>
  ) : (
    <>{avatar}</>
  );
}
