"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { Input } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

interface SocialPlatform {
  name: string;
  description: string;
  icon: string;
  shareUrl: (url: string) => string;
}

const socialPlatforms: SocialPlatform[] = [
  {
    name: "LinkedIn",
    description: "Professional network",
    icon: "linkedin",
    shareUrl: (url) => {
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    },
  },
  {
    name: "WhatsApp",
    description: "Message contacts",
    icon: "whatsapp",
    shareUrl: (url) => {
      const text = "Here’s my Cal ID — use this link to easily book a time with me:";
      return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    },
  },
  {
    name: "Facebook",
    description: "Share with friends",
    icon: "facebook",
    shareUrl: (url) => {
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    },
  },
  {
    name: "Twitter",
    description: "Tweet it out",
    icon: "twitter",
    shareUrl: (url) => {
      const text = "Here’s my Cal ID — book a time with me in seconds:";
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
        text
      )}`;
    },
  },
  {
    name: "Email",
    description: "Share via email",
    icon: "mail",
    shareUrl: (url) => {
      const subject = "Schedule a meeting";
      const body =
        "Hi,\n\nHere’s my Cal ID! You can quickly find a time that works for both of us using the link below:\n\n";
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${body}${url}`)}`;
    },
  },
  {
    name: "Reddit",
    description: "Post on Reddit",
    icon: "reddit",
    shareUrl: (url) => {
      const title = "Sharing my Cal ID — the easiest way to schedule a meeting with me";
      return `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    },
  },
];

// Simple SVG icons for social platforms
const SocialIcon = ({ name }: { name: string }) => {
  const iconSize = 20;

  switch (name) {
    case "facebook":
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "twitter":
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#1DA1F2">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#0077B5">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      );
    case "mail":
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case "reddit":
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#FF4500">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-1.272a1.25 1.25 0 0 1-.636-1.106l-.001-.001a1.25 1.25 0 0 1 1.248-1.25l.01-.001 2.484 1.22a1.25 1.25 0 0 1 .25 1.354zm-9.02 0a1.25 1.25 0 0 1 1.25-1.25c.688 0 1.25.561 1.25 1.25v.001a1.25 1.25 0 0 1-1.248 1.25l-2.484-1.22a1.25 1.25 0 0 1-.25-1.354l2.482-1.218a1.25 1.25 0 0 1 1.25-1.249zM12 6.5c-3.584 0-6.5 2.916-6.5 6.5 0 1.43.465 2.75 1.25 3.825l-.01.01c.05.1.1.2.15.3.1.2.2.4.3.5.1.1.2.2.3.3.1.1.2.2.3.3.1.1.2.2.3.2.1.1.2.1.3.2.1.1.2.1.3.1.1 0 .2.1.3.1.1 0 .2 0 .3.1.1 0 .2 0 .3-.1.1 0 .2-.1.3-.1.1 0 .2-.1.3-.2.1 0 .2-.1.3-.2.1-.1.2-.1.3-.3.1-.1.2-.2.3-.3.1-.1.2-.2.3-.5.05-.1.1-.2.15-.3l-.01-.01c.785-1.075 1.25-2.395 1.25-3.825 0-3.584-2.916-6.5-6.5-6.5zm-3.5 7.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm7 0c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm-3.5 2.5c-1.105 0-2.12-.402-2.9-1.07l.9-.9c.58.58 1.38.97 2.3.97.92 0 1.72-.39 2.3-.97l.9.9c-.78.668-1.795 1.07-2.9 1.07z" />
        </svg>
      );
    default:
      return null;
  }
};

export function ShareModal({ isOpen, onClose, shareUrl }: ShareModalProps) {
  const { t } = useLocale();
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    triggerToast("Link copied!", "success");
  };

  const handleSocialShare = (platform: SocialPlatform) => {
    window.open(
      platform.shareUrl(shareUrl),
      "_blank",
      "width=600,height=400,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("share_now")}</DialogTitle>
          <DialogDescription>{t("choose_platform")}</DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input type="text" value={shareUrl} readOnly />
              <Button onClick={handleCopyLink} color="secondary">
                <Icon name="clipboard" className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="share-2" className="h-5 w-5" />
              <h3 className="text-sm font-medium">{t("share_on_social_platforms")}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {socialPlatforms.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handleSocialShare(platform)}
                  className="flex items-center justify-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white">
                    <SocialIcon name={platform.icon} />
                  </div>
                  <div className="hidden min-w-0 flex-1 sm:block">
                    <div className="text-sm font-medium">{platform.name}</div>
                    <div className="truncate text-xs text-gray-500">{platform.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
