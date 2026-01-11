import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Badge } from "@calcom/ui/components/badge";
import { _generateMetadata, getTranslate } from "app/_utils";
import Link from "next/link";

import { TriggerProrationForm } from "./_components/TriggerProrationForm";
import { getProrationStats, getSeatChangeStats, getTeamBillingOverview } from "./_queries";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing_stats"),
    (t) => t("admin_billing_stats_description"),
    undefined,
    undefined,
    "/settings/admin/billing-stats"
  );

const Page = async () => {
  const t = await getTranslate();
  const [prorationData, seatChangeData, teams] = await Promise.all([
    getProrationStats(),
    getSeatChangeStats(),
    getTeamBillingOverview(),
  ]);

  return (
    <SettingsHeader title={t("billing_stats")} description={t("admin_billing_stats_description")}>
      <div className="space-y-6">
        <TriggerProrationForm />

        <div>
          <h3 className="text-emphasis mb-4 text-lg font-semibold">Monthly Proration Overview</h3>
          <div className="bg-default border-subtle grid grid-cols-1 gap-4 rounded-lg border p-6 md:grid-cols-5">
            <div>
              <p className="text-subtle text-sm">Total Prorations</p>
              <p className="text-emphasis text-2xl font-bold">{prorationData.stats.total}</p>
            </div>
            <div>
              <p className="text-subtle text-sm">Pending</p>
              <p className="text-emphasis text-2xl font-bold">{prorationData.stats.pending}</p>
            </div>
            <div>
              <p className="text-subtle text-sm">Charged</p>
              <p className="text-emphasis text-2xl font-bold">{prorationData.stats.charged}</p>
            </div>
            <div>
              <p className="text-subtle text-sm">Failed</p>
              <p className="text-emphasis text-2xl font-bold">{prorationData.stats.failed}</p>
            </div>
            <div>
              <p className="text-subtle text-sm">Total Revenue</p>
              <p className="text-emphasis text-2xl font-bold">
                ${prorationData.stats.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Seat Change Stats */}
        <div>
          <h3 className="text-emphasis mb-4 text-lg font-semibold">Seat Changes</h3>
          <div className="bg-default border-subtle grid grid-cols-1 gap-4 rounded-lg border p-6 md:grid-cols-4">
            <div>
              <p className="text-subtle text-sm">Total Changes</p>
              <p className="text-emphasis text-2xl font-bold">{seatChangeData.stats.total}</p>
            </div>
            <div>
              <p className="text-subtle text-sm">Current Month ({seatChangeData.stats.currentMonthKey})</p>
              <p className="text-emphasis text-2xl font-bold">{seatChangeData.stats.currentMonth}</p>
            </div>
            <div>
              <p className="text-subtle text-sm">Total Additions</p>
              <p className="text-success text-2xl font-bold">+{seatChangeData.stats.totalAdditions}</p>
            </div>
            <div>
              <p className="text-subtle text-sm">Total Removals</p>
              <p className="text-error text-2xl font-bold">-{seatChangeData.stats.totalRemovals}</p>
            </div>
          </div>
        </div>

        {/* Recent Prorations */}
        <div>
          <h3 className="text-emphasis mb-4 text-lg font-semibold">Recent Prorations</h3>
          <div className="bg-default border-subtle overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-subtle">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Team</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Month</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Seats</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-subtle divide-y">
                {prorationData.recentProrations.map((proration) => (
                  <tr key={proration.id}>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/settings/teams/${proration.team.id}/profile`}
                        className="text-emphasis hover:underline">
                        {proration.team.name}
                      </Link>
                    </td>
                    <td className="text-default px-4 py-3 text-sm">{proration.monthKey}</td>
                    <td className="text-default px-4 py-3 text-sm">
                      {proration.seatsAtStart} → {proration.seatsAtEnd} (+
                      {proration.netSeatIncrease})
                    </td>
                    <td className="text-default px-4 py-3 text-sm">${proration.proratedAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge
                        variant={
                          proration.status === "CHARGED"
                            ? "success"
                            : proration.status === "FAILED"
                              ? "error"
                              : "default"
                        }>
                        {proration.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {proration.invoiceId && (
                        <a
                          href={`https://dashboard.stripe.com/invoices/${proration.invoiceId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline">
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Seat Changes */}
        <div>
          <h3 className="text-emphasis mb-4 text-lg font-semibold">Recent Seat Changes</h3>
          <div className="bg-default border-subtle overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-subtle">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Team</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Seats</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Month</th>
                </tr>
              </thead>
              <tbody className="divide-subtle divide-y">
                {seatChangeData.recentChanges.map((change) => (
                  <tr key={change.id}>
                    <td className="text-default px-4 py-3 text-sm">
                      {new Date(change.changeDate).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/settings/teams/${change.team.id}/profile`}
                        className="text-emphasis hover:underline">
                        {change.team.name}
                      </Link>
                    </td>
                    <td className="text-default px-4 py-3 text-sm">{change.userId || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={change.changeType === "ADDITION" ? "success" : "error"}>
                        {change.changeType}
                      </Badge>
                    </td>
                    <td className="text-default px-4 py-3 text-sm">
                      {change.changeType === "ADDITION" ? "+" : "-"}
                      {change.seatCount}
                    </td>
                    <td className="text-default px-4 py-3 text-sm">{change.monthKey}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Billing Overview */}
        <div>
          <h3 className="text-emphasis mb-4 text-lg font-semibold">Team Billing Overview</h3>
          <div className="bg-default border-subtle overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-subtle">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Team</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Members</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Plan</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Price/Seat</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-subtle divide-y">
                {teams.map((team) => {
                  const billing = team.isOrganization ? team.organizationBilling : team.teamBilling;
                  if (!billing) return null;

                  return (
                    <tr key={team.id}>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/settings/teams/${team.id}/profile`}
                          className="text-emphasis hover:underline">
                          {team.name}
                        </Link>
                      </td>
                      <td className="text-default px-4 py-3 text-sm">
                        {team.isOrganization ? "Organization" : "Team"}
                      </td>
                      <td className="text-default px-4 py-3 text-sm">{team._count.members}</td>
                      <td className="text-default px-4 py-3 text-sm">{billing.billingPeriod}</td>
                      <td className="text-default px-4 py-3 text-sm">
                        ${billing.pricePerSeat?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={billing.status === "ACTIVE" ? "success" : "default"}>
                          {billing.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {billing.customerId && (
                          <a
                            href={`https://dashboard.stripe.com/customers/${billing.customerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline">
                            Customer
                          </a>
                        )}
                        {" / "}
                        {billing.subscriptionId && (
                          <a
                            href={`https://dashboard.stripe.com/subscriptions/${billing.subscriptionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline">
                            Sub
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SettingsHeader>
  );
};

export default Page;
