import type { SalesforceAuditData, AppsAuditData } from "./actions/CreatedAuditActionService";

/**
 * Salesforce additional info structure returned by the Salesforce CRM service
 * when creating events
 */
interface SalesforceAdditionalInfo {
    contacts?: Array<{
        id: string;
        email: string;
        recordType?: string;
    }>;
    sfEvent?: {
        id: string;
        success: boolean;
    };
    calWarnings?: string[];
    /** Fields written to the event record */
    eventRecordFields?: Record<string, unknown>;
    /** Fields written to the lead/contact record */
    leadOrContactFields?: Record<string, unknown>;
    /** Record created in Salesforce */
    createdRecord?: {
        type: "lead" | "contact";
        id: string;
    };
}

/**
 * EventManager result structure for CRM events
 */
interface CrmEventResult {
    type: string;
    appName?: string;
    success: boolean;
    uid: string;
    createdEvent?: {
        id: string;
        additionalInfo?: SalesforceAdditionalInfo;
    };
    id?: string;
    credentialId?: number;
}

/**
 * Extracts Salesforce audit data from EventManager results
 * 
 * This function processes the results from EventManager.create() or EventManager.reschedule()
 * and extracts Salesforce-specific data for audit logging.
 * 
 * @param results - Array of event results from EventManager
 * @returns AppsAuditData object with Salesforce data if available, undefined otherwise
 */
export function extractSalesforceAuditData(results: unknown[]): AppsAuditData | undefined {
    if (!results || !Array.isArray(results) || results.length === 0) {
        return undefined;
    }

    // Find Salesforce CRM result
    const salesforceResult = results.find((result): result is CrmEventResult => {
        if (!result || typeof result !== "object") return false;
        const r = result as Record<string, unknown>;
        return (
            typeof r.type === "string" &&
            (r.type.includes("salesforce") || r.type === "salesforce_other_calendar")
        );
    });

    if (!salesforceResult) {
        return undefined;
    }

    const additionalInfo = salesforceResult.createdEvent?.additionalInfo as SalesforceAdditionalInfo | undefined;

    if (!additionalInfo) {
        return undefined;
    }

    const salesforceData: SalesforceAuditData = {};

    // Extract lead/contact created info
    if (additionalInfo.createdRecord) {
        salesforceData.leadOrContactCreated = {
            type: additionalInfo.createdRecord.type,
            id: additionalInfo.createdRecord.id,
        };
    } else if (additionalInfo.contacts && additionalInfo.contacts.length > 0) {
        // Fallback: try to extract from contacts array
        const firstContact = additionalInfo.contacts[0];
        if (firstContact.id) {
            salesforceData.leadOrContactCreated = {
                type: (firstContact.recordType?.toLowerCase() === "lead" ? "lead" : "contact") as "lead" | "contact",
                id: firstContact.id,
            };
        }
    }

    // Extract event record fields
    if (additionalInfo.eventRecordFields && Object.keys(additionalInfo.eventRecordFields).length > 0) {
        salesforceData.eventRecordFields = additionalInfo.eventRecordFields;
    }

    // Extract lead/contact fields
    if (additionalInfo.leadOrContactFields && Object.keys(additionalInfo.leadOrContactFields).length > 0) {
        salesforceData.leadOrContactFields = additionalInfo.leadOrContactFields;
    }

    // Only return if we have any Salesforce data
    if (Object.keys(salesforceData).length === 0) {
        return undefined;
    }

    return {
        salesforce: salesforceData,
    };
}

/**
 * Type guard to check if a result is a Salesforce CRM result
 */
export function isSalesforceCrmResult(result: unknown): result is CrmEventResult {
    if (!result || typeof result !== "object") return false;
    const r = result as Record<string, unknown>;
    return (
        typeof r.type === "string" &&
        (r.type.includes("salesforce") || r.type === "salesforce_other_calendar")
    );
}
