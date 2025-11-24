import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export const Branding = ({
  showLogo = true,
  showText = true,
  variant = "default",
  size = "sm",
  bannerUrl,
}: {
  showLogo?: boolean;
  showText?: boolean;
  variant?: "default" | "minimal" | "prominent";
  size?: "xs" | "sm" | "md";
  bannerUrl?: string | null;
}) => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
  };
  
  const variantClasses = {
    default: "text-subtle hover:text-emphasis transition-colors",
    minimal: "text-muted opacity-60 hover:opacity-100 transition-opacity",
    prominent: "text-emphasis font-medium hover:text-brand transition-colors",
  };
  
  const containerClasses = {
    default: `p-3 text-center ${isEmbed ? "max-w-4xl" : ""}`,
    minimal: `p-1 text-right ${isEmbed ? "max-w-2xl" : ""}`,
    prominent: `p-4 text-center bg-subtle rounded-lg ${isEmbed ? "max-w-5xl" : ""}`,
  };
  
  // Image height classes - much larger for actual visibility
  const imageHeightClasses = {
    xs: "h-8",      // 24px
    sm: "h-12",      // 32px
    md: "h-16",     // 48px
  };
  
  const signupUrl = `${WEBAPP_URL}/signup?utm_source=booking_page&utm_medium=banner&utm_campaign=signup_promo&utm_content=calid_booking_banner`;
  
  return (
    <div className={containerClasses[variant]}>
      <a
        href={signupUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${sizeClasses[size]} ${variantClasses[variant]} inline-block`}>
        {showLogo && (
          <img
            className={`inline w-auto dark:invert ${imageHeightClasses[size]}`}
            src={bannerUrl || `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/logo`}
            alt={`${APP_NAME} Logo`}
          />
        )}
        {!showLogo && showText && <span className="font-medium">{APP_NAME}</span>}
      </a>
    </div>
  );
};