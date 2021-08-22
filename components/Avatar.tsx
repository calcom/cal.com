import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { defaultAvatarSrc } from "@lib/profile";

export type AvatarProps = {
  className?: string;
  imageSrc?: string;
  displayName: string;
  gravatarFallbackMd5?: string;
};

export default function Avatar({ imageSrc, displayName, gravatarFallbackMd5, className = "" }: AvatarProps) {
  return (
    <AvatarPrimitive.Root>
      <AvatarPrimitive.Image src={imageSrc} alt={displayName} className={className} />
      <AvatarPrimitive.Fallback delayMs={600}>
        {gravatarFallbackMd5 && (
          <img src={defaultAvatarSrc({ md5: gravatarFallbackMd5 })} alt={displayName} className={className} />
        )}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
