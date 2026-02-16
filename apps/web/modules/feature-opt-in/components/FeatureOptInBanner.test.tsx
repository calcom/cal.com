import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeatureOptInBanner } from "./FeatureOptInBanner";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img alt={props.alt as string} />,
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children as React.ReactNode}</button>
  ),
}));

const baseConfig: OptInFeatureConfig = {
  slug: "bookings-v3",
  i18n: { title: "title", name: "name", description: "desc" },
  bannerImage: { src: "/img.png", width: 100, height: 100 },
  policy: "permissive",
};

describe("FeatureOptInBanner viewport classes", () => {
  it("applies no visibility class when showBannerOn is undefined (defaults to all)", () => {
    render(<FeatureOptInBanner featureConfig={baseConfig} onDismiss={vi.fn()} onOpenDialog={vi.fn()} />);
    const banner = screen.getByTestId("feature-opt-in-banner");
    expect(banner.className).not.toContain("hidden");
    expect(banner.className).not.toContain("md:hidden");
  });

  it("applies no visibility class when showBannerOn is 'all'", () => {
    render(
      <FeatureOptInBanner
        featureConfig={{ ...baseConfig, showBannerOn: "all" }}
        onDismiss={vi.fn()}
        onOpenDialog={vi.fn()}
      />
    );
    const banner = screen.getByTestId("feature-opt-in-banner");
    expect(banner.className).not.toContain("hidden");
    expect(banner.className).not.toContain("md:hidden");
  });

  it("applies 'hidden md:block' when showBannerOn is 'desktop'", () => {
    render(
      <FeatureOptInBanner
        featureConfig={{ ...baseConfig, showBannerOn: "desktop" }}
        onDismiss={vi.fn()}
        onOpenDialog={vi.fn()}
      />
    );
    const banner = screen.getByTestId("feature-opt-in-banner");
    expect(banner.className).toContain("hidden");
    expect(banner.className).toContain("md:block");
  });

  it("applies 'md:hidden' when showBannerOn is 'mobile'", () => {
    render(
      <FeatureOptInBanner
        featureConfig={{ ...baseConfig, showBannerOn: "mobile" }}
        onDismiss={vi.fn()}
        onOpenDialog={vi.fn()}
      />
    );
    const banner = screen.getByTestId("feature-opt-in-banner");
    expect(banner.className).toContain("md:hidden");
  });
});
