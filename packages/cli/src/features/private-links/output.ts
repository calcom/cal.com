import chalk from "chalk";
import { type OutputOptions, renderSuccess, renderTable } from "../../shared/output";
import type { PrivateLink, PrivateLinkCreated, PrivateLinkList, PrivateLinkUpdated } from "./types";

function isTimeBased(link: PrivateLink): link is PrivateLink & { expiresAt: string } {
  return "expiresAt" in link;
}

function isUsageBased(
  link: PrivateLink
): link is PrivateLink & { maxUsageCount: number; usageCount: number } {
  return "maxUsageCount" in link && "usageCount" in link;
}

function formatExpiredStatus(isExpired: boolean): string {
  return isExpired ? chalk.red("Yes") : chalk.green("No");
}

function formatLinkType(link: PrivateLink): string {
  if (isTimeBased(link)) {
    return "Time-based";
  }
  return "Usage-based";
}

function formatLinkDetails(link: PrivateLink): string {
  if (isTimeBased(link)) {
    return `Expires: ${link.expiresAt}`;
  }
  if (isUsageBased(link)) {
    return `Usage: ${link.usageCount}/${link.maxUsageCount}`;
  }
  return "N/A";
}

export function renderPrivateLinkList(
  links: PrivateLinkList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(links, null, 2));
    return;
  }

  if (!links || links.length === 0) {
    console.log("No private links found.");
    return;
  }

  renderTable(
    ["Link ID", "Type", "Expired", "Details", "Booking URL"],
    links.map((link) => [
      link.linkId,
      formatLinkType(link),
      formatExpiredStatus(link.isExpired),
      formatLinkDetails(link),
      link.bookingUrl,
    ])
  );
}

export function renderPrivateLink(link: PrivateLink | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(link, null, 2));
    return;
  }

  if (!link) {
    console.log("Private link not found.");
    return;
  }

  console.log(chalk.bold(`\nPrivate Link: ${link.linkId}`));
  console.log(`  Event Type ID: ${link.eventTypeId}`);
  console.log(`  Type:          ${formatLinkType(link)}`);
  console.log(`  Expired:       ${formatExpiredStatus(link.isExpired)}`);
  console.log(`  Booking URL:   ${link.bookingUrl}`);

  if (isTimeBased(link)) {
    console.log(`  Expires At:    ${link.expiresAt}`);
  }

  if (isUsageBased(link)) {
    console.log(`  Max Usage:     ${link.maxUsageCount}`);
    console.log(`  Current Usage: ${link.usageCount}`);
  }

  console.log();
}

export function renderPrivateLinkCreated(
  link: PrivateLinkCreated | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(link, null, 2));
    return;
  }

  if (!link) {
    console.log("Failed to create private link.");
    return;
  }

  renderSuccess(`Private link created: ${link.linkId}`);
  console.log(`  Booking URL: ${link.bookingUrl}`);
}

export function renderPrivateLinkUpdated(
  link: PrivateLinkUpdated | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(link, null, 2));
    return;
  }

  if (!link) {
    console.log("Failed to update private link.");
    return;
  }

  renderSuccess(`Private link updated: ${link.linkId}`);
}

export function renderPrivateLinkDeleted(linkId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Private link ${linkId} deleted` }));
    return;
  }

  renderSuccess(`Private link "${linkId}" deleted.`);
}
