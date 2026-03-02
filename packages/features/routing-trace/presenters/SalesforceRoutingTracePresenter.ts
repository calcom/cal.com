import type { RoutingStep } from "../repositories/RoutingTraceRepository.interface";

export class SalesforceRoutingTracePresenter {
  static present(step: RoutingStep): string {
    const d = step.data;
    switch (step.step) {
      case "searching_by_website_value":
        return `Searching for Salesforce account by website matching domain "${d.emailDomain}"`;
      case "account_found_by_website":
        return `Account found by website "${d.website}" (Account ID: ${d.accountId})`;
      case "searching_by_contact_email_domain":
        return `Searching contacts with email domain "${d.emailDomain}" (${d.contactCount} contacts found)`;
      case "account_selected_by_most_contacts":
        return `Account selected with most contacts: ${d.accountId} (${d.contactCount} contacts)`;
      case "no_account_found":
        return `No account found for ${d.email}: ${d.reason}`;
      case "lookup_field_query":
        return `Querying lookup field "${d.fieldName}" on ${d.salesforceObject}${d.accountId ? ` (Account: ${d.accountId})` : ""}`;
      case "user_query_from_lookup_field":
        return `Lookup field resolved to user ${d.userEmail} (User ID: ${d.lookupFieldUserId})`;
      case "contact_owner_lookup":
        return `Contact owner lookup: ${d.ownerEmail} (Contact: ${d.contactId})`;
      case "lead_owner_lookup":
        return `Lead owner lookup: ${d.ownerEmail} (Lead: ${d.leadId})`;
      case "account_owner_lookup":
        return `Account owner lookup: ${d.ownerEmail} (Account: ${d.accountId})`;
      case "owner_validated":
        return `Owner ${d.ownerEmail} validated as team member: ${d.isTeamMember}`;
      case "owner_lookup_skipped":
        return `Owner lookup skipped: ${d.reason}${d.email ? ` (${d.email})` : ""}`;
      case "contact_owner_check_skipped":
        return `Contact owner check skipped: ${d.reason}`;
      case "graphql_query_initiated":
        return `GraphQL account resolution initiated for ${d.email} (domain: ${d.emailDomain})`;
      case "graphql_existing_contact_found":
        return `Existing contact found via GraphQL: ${d.contactId} (Account: ${d.accountId}, Owner: ${d.ownerEmail})`;
      case "graphql_account_found_by_website":
        return `Account found by website via GraphQL: ${d.accountId} (Owner: ${d.ownerEmail})`;
      case "graphql_searching_by_contact_domain":
        return `Searching contacts by domain via GraphQL: "${d.emailDomain}" (${d.contactCount} contacts)`;
      case "graphql_dominant_account_selected":
        return `Dominant account selected via GraphQL: ${d.accountId} (${d.contactCount} contacts, Owner: ${d.ownerEmail})`;
      case "graphql_no_account_found":
        return `No account found via GraphQL for ${d.email}: ${d.reason}`;
      case "salesforce_assignment":
        return `Salesforce assignment: ${d.email} via ${d.recordType} (ID: ${d.recordId})`;
      default:
        return `Salesforce: ${step.step}`;
    }
  }
}
