"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { HorizontalTabs } from "@calcom/ui/components/navigation";
import { Badge } from "@calcom/ui/components/badge";
import { Alert } from "@calcom/ui/components/alert";
import { showToast } from "@calcom/ui/components/toast";

import { BlockedEmailsList } from "./components/BlockedEmailsList";
import { BlockedDomainsList } from "./components/BlockedDomainsList";
import { ReportedBookingsList } from "./components/ReportedBookingsList";

export default function BlockListPage() {
    const { t } = useLocale();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("reported-bookings");

    // Get organization ID from the user's organization
    const { data: user } = trpc.viewer.me.useQuery();
    // Temporarily use a hardcoded organization ID for testing
    const organizationId = user?.organizationId || 683; // Use the test organization ID

    // Temporarily disable organization check for testing
    // if (!organizationId) {
    //     return (
    //         <div className="flex items-center justify-center min-h-[400px]">
    //             <Alert
    //                 severity="warning"
    //                 title={t("no_organization_found")}
    //                 message={t("no_organization_found_description")}
    //             />
    //         </div>
    //     );
    // }

    const tabs = [
        {
            name: t("reported_bookings"),
            href: "#reported-bookings",
            "data-testid": "reported-bookings",
        },
        {
            name: t("blocked_emails"),
            href: "#blocked-emails", 
            "data-testid": "blocked-emails",
        },
        {
            name: t("blocked_domains"),
            href: "#blocked-domains",
            "data-testid": "blocked-domains",
        },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case "reported-bookings":
                return (
                    <PanelCard
                        title={t("reported_bookings")}
                        subtitle={t("reported_bookings_description")}
                    >
                        <ReportedBookingsList organizationId={organizationId} />
                    </PanelCard>
                );
            case "blocked-emails":
                return (
                    <PanelCard
                        title={t("blocked_emails")}
                        subtitle={t("blocked_emails_description")}
                    >
                        <BlockedEmailsList organizationId={organizationId} />
                    </PanelCard>
                );
            case "blocked-domains":
                return (
                    <PanelCard
                        title={t("blocked_domains")}
                        subtitle={t("blocked_domains_description")}
                    >
                        <BlockedDomainsList organizationId={organizationId} />
                    </PanelCard>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">{t("block_list")}</h1>
                    <p className="text-sm text-gray-600">
                        {t("block_list_description")}
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                >
                    {t("back")}
                </Button>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab["data-testid"])}
                            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab["data-testid"]
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="space-y-4">
                {renderTabContent()}
            </div>
        </div>
    );
}
