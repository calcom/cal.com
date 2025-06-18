"use client";

import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

interface PreviewBannerProps {
  bookingUrl: string;
}

export function PreviewBanner({ bookingUrl }: PreviewBannerProps) {
  return (
    <div className="border-attention bg-attention/10 mb-6 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Icon name="eye" className="text-attention mr-2 h-5 w-5" />
          <div>
            <p className="text-emphasis font-medium">This is a preview</p>
            <p className="text-subtle text-sm">This page is optimized for search engines.</p>
          </div>
        </div>
        <Button href={bookingUrl} className="ml-4" size="sm">
          Book Now
        </Button>
      </div>
    </div>
  );
}
