import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";
import { useState } from "react";
import type { ZoomInfoEnrichedData } from "../zod";

interface ZoomInfoEnrichedDataDisplayProps {
  enrichedData: Record<string, ZoomInfoEnrichedData>;
  attendeeEmails: string[];
}

export function ZoomInfoEnrichedDataDisplay({
  enrichedData,
  attendeeEmails,
}: ZoomInfoEnrichedDataDisplayProps) {
  const { t } = useLocale();
  const [expandedAttendees, setExpandedAttendees] = useState<Set<string>>(new Set());

  if (!enrichedData || Object.keys(enrichedData).length === 0) {
    return null;
  }

  const toggleAttendee = (email: string) => {
    setExpandedAttendees((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(email)) {
        newSet.delete(email);
      } else {
        newSet.add(email);
      }
      return newSet;
    });
  };

  const enrichedAttendees = attendeeEmails.filter((email) => enrichedData[email.toLowerCase()]);

  if (enrichedAttendees.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="building" className="h-4 w-4 text-subtle" />
        <span className="font-medium">{t("zoominfo_enriched_data")}</span>
        <Badge variant="blue">ZoomInfo</Badge>
      </div>
      <div className="space-y-3">
        {enrichedAttendees.map((email) => {
          const data = enrichedData[email.toLowerCase()];
          if (!data) return null;

          const isExpanded = expandedAttendees.has(email);
          const displayName = data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : email;

          return (
            <div key={email} className="rounded-lg border border-subtle bg-muted p-3">
              <button
                type="button"
                onClick={() => toggleAttendee(email)}
                className="flex w-full items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{displayName}</span>
                  {data.jobTitle && <span className="text-sm text-subtle">{data.jobTitle}</span>}
                </div>
                <Icon name={isExpanded ? "chevron-up" : "chevron-down"} className="h-4 w-4 text-subtle" />
              </button>

              {isExpanded && (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {data.email && (
                    <>
                      <span className="text-subtle">{t("email")}</span>
                      <span>{data.email}</span>
                    </>
                  )}
                  {data.phone && (
                    <>
                      <span className="text-subtle">{t("phone")}</span>
                      <span>{data.phone}</span>
                    </>
                  )}
                  {data.jobFunction && (
                    <>
                      <span className="text-subtle">{t("zoominfo_job_function")}</span>
                      <span>{data.jobFunction}</span>
                    </>
                  )}
                  {data.managementLevel && (
                    <>
                      <span className="text-subtle">{t("zoominfo_management_level")}</span>
                      <span>{data.managementLevel}</span>
                    </>
                  )}
                  {data.linkedInUrl && (
                    <>
                      <span className="text-subtle">LinkedIn</span>
                      <a
                        href={data.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline">
                        {t("view_profile")}
                      </a>
                    </>
                  )}

                  {data.companyName && (
                    <>
                      <div className="col-span-2 mt-2 border-subtle border-t pt-2">
                        <span className="font-medium">{t("zoominfo_company_info")}</span>
                      </div>
                      <span className="text-subtle">{t("company")}</span>
                      <span>{data.companyName}</span>
                    </>
                  )}
                  {data.companyWebsite && (
                    <>
                      <span className="text-subtle">{t("website")}</span>
                      <a
                        href={
                          data.companyWebsite.startsWith("http")
                            ? data.companyWebsite
                            : `https://${data.companyWebsite}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline">
                        {data.companyWebsite}
                      </a>
                    </>
                  )}
                  {data.companyIndustry && (
                    <>
                      <span className="text-subtle">{t("zoominfo_industry")}</span>
                      <span>{data.companyIndustry}</span>
                    </>
                  )}
                  {data.companyEmployeeCount && (
                    <>
                      <span className="text-subtle">{t("zoominfo_employees")}</span>
                      <span>{data.companyEmployeeCount.toLocaleString()}</span>
                    </>
                  )}
                  {data.companyRevenue && (
                    <>
                      <span className="text-subtle">{t("zoominfo_revenue")}</span>
                      <span>{data.companyRevenue}</span>
                    </>
                  )}
                  {(data.companyCity || data.companyState || data.companyCountry) && (
                    <>
                      <span className="text-subtle">{t("location")}</span>
                      <span>
                        {[data.companyCity, data.companyState, data.companyCountry]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ZoomInfoEnrichedDataDisplay;
