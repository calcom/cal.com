"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BadgeProps } from "@calcom/ui/components/badge";
import { Badge } from "@calcom/ui/components/badge";
import { PanelCard } from "@calcom/ui/components/card";
import { Icon } from "@calcom/ui/components/icon";
import type { ReactElement } from "react";

type AppStatus = {
  slug: string;
  dirName: string;
  enabled: boolean;
  categories: string[];
};

type HealthCheckData = {
  apps: {
    installed: AppStatus[];
    total: number;
  };
  license: {
    hasEnvKey: boolean;
    hasDbKey: boolean;
    isValid: boolean;
  };
  email: {
    hasEmailFrom: boolean;
    hasSendgridApiKey: boolean;
    hasSmtpConfig: boolean;
    provider: "sendgrid" | "smtp" | "none";
  };
  redis: {
    hasUpstashUrl: boolean;
    hasUpstashToken: boolean;
  };
  database: {
    connected: boolean;
    error?: string;
  };
};

type StatusBadgeProps = {
  configured: boolean;
  configuredLabel?: string;
  notConfiguredLabel?: string;
};

function StatusBadge({
  configured,
  configuredLabel = "Configured",
  notConfiguredLabel = "Not Configured",
}: StatusBadgeProps): ReactElement {
  let variant: BadgeProps["variant"] = "orange";
  let label = notConfiguredLabel;
  if (configured) {
    variant = "green";
    label = configuredLabel;
  }
  return (
    <Badge variant={variant} withDot>
      {label}
    </Badge>
  );
}

type StatusRowProps = {
  label: string;
  configured: boolean;
  configuredLabel?: string;
  notConfiguredLabel?: string;
};

function StatusRow({ label, configured, configuredLabel, notConfiguredLabel }: StatusRowProps): ReactElement {
  return (
    <div className="flex items-center justify-between border-b border-subtle px-4 py-3 last:border-b-0">
      <span className="text-default text-sm">{label}</span>
      <StatusBadge
        configured={configured}
        configuredLabel={configuredLabel}
        notConfiguredLabel={notConfiguredLabel}
      />
    </div>
  );
}

function getEmailProviderLabel(provider: "sendgrid" | "smtp" | "none", t: (key: string) => string): string {
  if (provider === "sendgrid") {
    return "SendGrid";
  }
  if (provider === "smtp") {
    return "SMTP";
  }
  return t("not_configured");
}

type EmailProviderBadgeProps = {
  provider: "sendgrid" | "smtp" | "none";
  t: (key: string) => string;
};

function EmailProviderBadge({ provider, t }: EmailProviderBadgeProps): ReactElement {
  let variant: BadgeProps["variant"] = "orange";
  if (provider !== "none") {
    variant = "green";
  }
  return (
    <Badge variant={variant} withDot>
      {getEmailProviderLabel(provider, t)}
    </Badge>
  );
}

function renderAppsList(
  apps: HealthCheckData["apps"]["installed"],
  t: (key: string) => string
): ReactElement {
  if (apps.length === 0) {
    return <div className="text-subtle px-4 py-3 text-sm">{t("no_apps_installed")}</div>;
  }

  return (
    <>
      {apps.map((app) => (
        <div key={app.slug} className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <span className="text-default text-sm font-medium">{app.slug}</span>
            <span className="text-subtle text-xs">{app.categories.join(", ")}</span>
          </div>
          <Badge variant="green" withDot>
            {t("enabled")}
          </Badge>
        </div>
      ))}
    </>
  );
}

type HealthCheckViewProps = {
  data: HealthCheckData;
};

function HealthCheckView({ data }: HealthCheckViewProps): ReactElement {
  const { t } = useLocale();

  const enabledApps = data.apps.installed.filter((app) => app.enabled);
  const disabledApps = data.apps.installed.filter((app) => !app.enabled);

  return (
    <div className="flex flex-col gap-6">
      {/* Database Status */}
      <PanelCard title={t("database")}>
        <StatusRow
          label={t("connection_status")}
          configured={data.database.connected}
          configuredLabel={t("connected")}
          notConfiguredLabel={t("disconnected")}
        />
        {data.database.error && (
          <div className="border-subtle bg-error/10 border-t px-4 py-3">
            <div className="text-error flex items-center gap-2 text-sm">
              <Icon name="circle-alert" className="h-4 w-4" />
              <span>{data.database.error}</span>
            </div>
          </div>
        )}
      </PanelCard>

      {/* License Key Status */}
      <PanelCard title={t("license")}>
        <StatusRow label={t("environment_variable")} configured={data.license.hasEnvKey} />
        <StatusRow label={t("database_configuration")} configured={data.license.hasDbKey} />
        <StatusRow
          label={t("license_validation")}
          configured={data.license.isValid}
          configuredLabel={t("valid")}
          notConfiguredLabel={t("invalid")}
        />
      </PanelCard>

      {/* Email Configuration */}
      <PanelCard title={t("email_configuration")}>
        <StatusRow label="EMAIL_FROM" configured={data.email.hasEmailFrom} />
        <div className="flex items-center justify-between border-b border-subtle px-4 py-3 last:border-b-0">
          <span className="text-default text-sm">{t("email_provider")}</span>
          <EmailProviderBadge provider={data.email.provider} t={t} />
        </div>
        {data.email.provider === "sendgrid" && (
          <StatusRow label="SENDGRID_API_KEY" configured={data.email.hasSendgridApiKey} />
        )}
        {data.email.provider === "smtp" && (
          <StatusRow label="SMTP (EMAIL_SERVER_HOST/PORT)" configured={data.email.hasSmtpConfig} />
        )}
      </PanelCard>

      {/* Redis Configuration */}
      <PanelCard title={t("redis_configuration")}>
        <StatusRow label="UPSTASH_REDIS_REST_URL" configured={data.redis.hasUpstashUrl} />
        <StatusRow label="UPSTASH_REDIS_REST_TOKEN" configured={data.redis.hasUpstashToken} />
      </PanelCard>

      {/* Installed Apps */}
      <PanelCard title={t("installed_apps")} subtitle={`${enabledApps.length} ${t("enabled").toLowerCase()}`}>
        <div className="divide-subtle divide-y">{renderAppsList(enabledApps, t)}</div>
      </PanelCard>

      {/* Disabled Apps */}
      {disabledApps.length > 0 && (
        <PanelCard
          title={t("disabled_apps")}
          subtitle={`${disabledApps.length} ${t("disabled").toLowerCase()}`}
          collapsible
          defaultCollapsed>
          <div className="divide-subtle divide-y">
            {disabledApps.map((app) => (
              <div key={app.slug} className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-default text-sm font-medium">{app.slug}</span>
                  <span className="text-subtle text-xs">{app.categories.join(", ")}</span>
                </div>
                <Badge variant="orange" withDot>
                  {t("disabled")}
                </Badge>
              </div>
            ))}
          </div>
        </PanelCard>
      )}
    </div>
  );
}

export type { HealthCheckData };
export default HealthCheckView;
