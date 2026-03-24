"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { Logo } from "@calid/features/ui/components/logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import ServerTrans from "@calcom/lib/components/ServerTrans";
import { APP_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { fetchUsernameSuggestions } from "@calcom/lib/fetchUsernameSuggestions";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const URL_PROTOCOL_REGEX = /(^\w+:|^)\/\//;

function truncateDomain(domain: string, maxLength = 25) {
  const clean = domain.replace(URL_PROTOCOL_REGEX, "");
  if (clean.length <= maxLength) return clean;
  return `${clean.substring(0, maxLength - 3)}...`;
}

const USERNAME_MAX_LENGTH = 20;
const TYPING_NAMES = ["sarah", "yourname", "david", "yourname", "alex", "yourname", "jordan", "yourname"];
const TYPING_DELAY_MS = 120;
const PAUSE_AFTER_TYPING_MS = 2000;
const PAUSE_AFTER_DELETING_MS = 800;

export default function YournameView() {
  const { t } = useLocale();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<
    "idle" | "invalid" | "short" | "checking" | "available" | "unavailable"
  >("idle");
  const [premium, setPremium] = useState(false);
  const [suggestion, setSuggestion] = useState<string | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [shuffleLoading, setShuffleLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [progressKey, setProgressKey] = useState(0);
  const [placeholder, setPlaceholder] = useState("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const debouncedUsername = useDebounce(username.trim().toLowerCase(), 600);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let nameIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const tick = () => {
      const name = TYPING_NAMES[nameIndex];
      if (isDeleting) {
        if (charIndex === 0) {
          isDeleting = false;
          nameIndex = (nameIndex + 1) % TYPING_NAMES.length;
          timeoutId = setTimeout(tick, PAUSE_AFTER_DELETING_MS);
        } else {
          charIndex -= 1;
          setPlaceholder(name.slice(0, charIndex));
          timeoutId = setTimeout(tick, TYPING_DELAY_MS);
        }
      } else {
        if (charIndex === name.length) {
          isDeleting = true;
          timeoutId = setTimeout(tick, PAUSE_AFTER_TYPING_MS);
        } else {
          charIndex += 1;
          setPlaceholder(name.slice(0, charIndex));
          timeoutId = setTimeout(tick, TYPING_DELAY_MS);
        }
      }
    };

    const startDelay = 400;
    timeoutId = setTimeout(() => {
      timeoutId = setTimeout(tick, TYPING_DELAY_MS);
    }, startDelay);
    return () => clearTimeout(timeoutId);
  }, []);
  const prefix = typeof window !== "undefined" ? truncateDomain(WEBSITE_URL) : "cal.id";

  useEffect(() => {
    const raw = username.trim().toLowerCase();
    if (!raw) {
      setStatus("idle");
      setSuggestions([]);
      setSuggestion(undefined);
      return;
    }

    if (!/^[a-z0-9-]*$/.test(raw)) {
      setStatus("invalid");
      setSuggestions([]);
      return;
    }

    if (raw.length < 3) {
      setStatus("short");
      setSuggestions([]);
      return;
    }

    if (raw !== debouncedUsername) {
      setStatus("checking");
    }
  }, [username, debouncedUsername]);

  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) return;
    if (!/^[a-z0-9-]*$/.test(debouncedUsername)) return;

    setStatus("checking");

    fetchUsername(debouncedUsername, null)
      .then(({ data }) => {
        setPremium(!!data.premium);
        setSuggestion(data.suggestion);
        if (data.available) {
          setStatus("available");
          setSuggestions([]);
        } else {
          setStatus("unavailable");
          setSuggestionsLoading(true);
          setSuggestions([]);
          const base = debouncedUsername.replace(/[^a-z0-9]/gi, "").toLowerCase() || "name";
          fetchUsernameSuggestions(base)
            .then(({ suggestions: s }) => setSuggestions(s))
            .catch(() => setSuggestions([]))
            .finally(() => setSuggestionsLoading(false));
        }
      })
      .catch(() => {
        setStatus("idle");
      });
  }, [debouncedUsername]);

  const handleClaim = () => {
    const value = username.trim().toLowerCase();
    if (status !== "available" || !value) return;
    setClaimLoading(true);

    setTimeout(() => {
      setClaimLoading(false);
      setModalOpen(true);
      setProgressKey((k) => k + 1);

      let time = 5;
      setCountdown(time);
      countdownRef.current = setInterval(() => {
        time -= 1;
        setCountdown(time);
        if (time <= 0 && countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          router.push(`/signup?username=${encodeURIComponent(value)}`);
        }
      }, 1000);
    }, 800);
  };

  const closeModal = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setModalOpen(false);
  };

  const handleSuggestionClick = (s: string) => {
    setUsername(s);
  };

  const handleShuffleSuggestions = async () => {
    const base = debouncedUsername.replace(/[^a-z0-9]/gi, "").toLowerCase() || "name";
    setShuffleLoading(true);
    try {
      const { suggestions: s } = await fetchUsernameSuggestions(base);
      setSuggestions(s);
    } finally {
      setShuffleLoading(false);
    }
  };

  const handleCopyLink = () => {
    const value = username.trim().toLowerCase();
    if (!value) return;
    const url = `${prefix}/${value}`;
    navigator.clipboard.writeText(url);
  };

  const isAvailable = status === "available";
  const isUnavailable = status === "unavailable";
  const isChecking = status === "checking";
  const showSuggestions = isUnavailable && (suggestionsLoading || suggestions.length > 0 || suggestion);

  return (
    <div className="bg-default flex min-h-screen flex-col">
      <header className="flex w-full items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-8 lg:px-16">
        <Logo />
        <Link href="/auth/login" className="text-default text-sm font-medium hover:underline">
          {t("already_have_account")} {t("sign_in")}
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-16 lg:py-12">
        <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl">
          <div className="mb-6 w-full text-center sm:mb-8 md:mb-12">
            <h1 className="mb-1.5 w-full text-2xl font-bold tracking-tight sm:mb-2 sm:text-3xl md:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-gray-900 via-gray-500 to-gray-400 bg-clip-text text-transparent dark:from-white dark:via-gray-300 dark:to-gray-500">
                {t("yourname_title", { appName: APP_NAME })}
              </span>
            </h1>
            <p className="text-subtle w-full text-sm sm:text-base md:text-lg">
              {t("yourname_description", { appName: APP_NAME })}
            </p>
          </div>

          <div className="border-subtle bg-default w-full rounded-md border p-4 shadow-sm sm:p-5 md:p-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="focus-within:border-default flex items-stretch overflow-hidden rounded-md transition-colors">
                <span className="text-muted flex shrink-0 items-center text-lg sm:text-xl md:text-2xl">
                  {prefix}/
                </span>
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().slice(0, USERNAME_MAX_LENGTH))}
                  maxLength={USERNAME_MAX_LENGTH}
                  placeholder={username ? "" : placeholder}
                  className="placeholder:text-muted text-default hover:border-default min-w-0 flex-1 rounded-md border-2 border-transparent bg-transparent px-2 py-2 text-lg font-bold outline-none transition-colors focus:outline-none focus:ring-0 sm:py-2.5 sm:text-xl md:py-3 md:text-2xl"
                  data-testid="yourname-input"
                />
                <Button
                  color="primary"
                  StartIcon="arrow-right"
                  disabled={!isAvailable || premium || claimLoading}
                  loading={claimLoading}
                  onClick={handleClaim}
                  className="ml-2 shrink-0 self-stretch px-3 text-sm font-semibold sm:px-4 sm:text-base"
                  data-testid="yourname-claim-button">
                  {t("claim")}
                </Button>
              </div>

              {username.length > 0 && (
                <div className="animate-fade-in-up flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {status === "invalid" && (
                      <span className="text-error flex items-center gap-2" data-testid="yourname-invalid">
                        <Icon name="circle-alert" className="h-4 w-4" />
                        {t("invalid_characters", { defaultValue: "Invalid characters" })}
                      </span>
                    )}
                    {status === "short" && (
                      <span className="text-muted">{t("too_short", { defaultValue: "Too short" })}</span>
                    )}
                    {isChecking && <span className="text-muted">{t("checking_username_availability")}</span>}
                    {isAvailable && !premium && (
                      <span className="text-success flex items-center gap-2" data-testid="yourname-available">
                        <Icon name="circle-check" className="h-4 w-4" />
                        {t("username_available")}
                      </span>
                    )}
                    {isAvailable && premium && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {t("premium_username", { price: "" })}
                      </span>
                    )}
                    {isUnavailable && (
                      <span className="text-error flex items-center gap-2" data-testid="yourname-unavailable">
                        <Icon name="circle-x" className="h-4 w-4" />
                        {t("already_in_use_error")}
                      </span>
                    )}
                  </div>
                  <span className="text-muted text-xs">
                    {username.length}/{USERNAME_MAX_LENGTH}
                  </span>
                </div>
              )}

              {showSuggestions && (
                <div className="animate-fade-in-up space-y-3">
                  <div className="text-muted flex items-center justify-between">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                      <Icon name="sparkles" className="h-3.5 w-3.5" />
                      {t("smart_suggestions")}
                    </p>
                    <button
                      type="button"
                      onClick={handleShuffleSuggestions}
                      disabled={shuffleLoading}
                      className="text-muted hover:text-emphasis flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                      aria-label={t("shuffle", { defaultValue: "Shuffle" })}>
                      <Icon
                        name="shuffle"
                        className={`h-3.5 w-3.5 ${shuffleLoading ? "animate-spin" : ""}`}
                      />
                      {t("shuffle", { defaultValue: "Shuffle" })}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestionsLoading ? (
                      <span className="text-muted flex items-center gap-2 text-sm">
                        <Icon name="loader-circle" className="h-4 w-4 animate-spin" />
                        {t("loading_suggestions")}
                      </span>
                    ) : (
                      <>
                        {suggestion && (
                          <button
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="border-subtle hover:border-primary text-emphasis rounded-md border px-2.5 py-1 text-xs transition-colors sm:px-3 sm:py-1.5 sm:text-sm">
                            {suggestion}
                          </button>
                        )}
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSuggestionClick(s)}
                            className="border-subtle hover:border-primary text-emphasis rounded-md border px-2.5 py-1 text-xs transition-colors sm:px-3 sm:py-1.5 sm:text-sm">
                            {s}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-subtle bg-default mt-6 flex items-center justify-center gap-2 rounded-full border px-3 py-2 shadow-sm sm:mt-8 sm:gap-3 sm:px-4 sm:py-2.5 md:mt-12 md:px-5 md:py-3">
          <div className="flex -space-x-1.5 sm:-space-x-2">
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix"
              alt=""
              className="h-5 w-5 rounded-full border-2 border-white bg-gray-100 sm:h-6 sm:w-6 dark:border-gray-800 dark:bg-gray-700"
            />
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Aneka"
              alt=""
              className="h-5 w-5 rounded-full border-2 border-white bg-gray-100 sm:h-6 sm:w-6 dark:border-gray-800 dark:bg-gray-700"
            />
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Zack"
              alt=""
              className="h-5 w-5 rounded-full border-2 border-white bg-gray-100 sm:h-6 sm:w-6 dark:border-gray-800 dark:bg-gray-700"
            />
          </div>
          <p className="text-muted text-xs sm:text-sm">
            <ServerTrans
              t={t}
              i18nKey="claim_username_trusted_by_professionals_description"
              values={{ count: "100K+" }}
            />
          </p>
        </div>
      </main>

      <footer className="p-4">
        <p className="text-muted text-center text-xs">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </footer>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent size="sm" className="flex flex-col items-center text-center">
          <DialogHeader
            showIcon
            iconName="check"
            iconVariant="success"
            className="flex-col items-center text-center [&>div]:text-center">
            <DialogTitle>{t("congratulations")} 🎉</DialogTitle>
            <DialogDescription>
              <ServerTrans
                t={t}
                i18nKey="yourname_reserved"
                values={{ username: username.trim().toLowerCase() }}
              />
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted mb-6 flex w-full items-center justify-between rounded-md p-3">
            <span className="font-semibold">
              {prefix}/{username.trim().toLowerCase()}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-muted hover:text-primary"
              aria-label={t("copy")}>
              <Icon name="copy" className="h-5 w-5" />
            </button>
          </div>

          <Button
            color="primary"
            className="mb-4 flex w-full items-center justify-center font-semibold"
            onClick={() => {
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
              }
              setModalOpen(false);
              router.push(`/signup?username=${encodeURIComponent(username.trim().toLowerCase())}`);
            }}>
            {t("continue")}
          </Button>

          <p className="text-muted mb-2 w-full text-center text-sm">
            {t("redirecting_in")} <strong>{countdown}</strong>s
          </p>
          <div className="bg-subtle h-1 w-full overflow-hidden rounded-full">
            <div key={progressKey} className="yourname-progress-fill bg-brand-default h-full rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
