import process from "node:process";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Contact } from "@calcom/types/CrmService";
import { Client, cacheExchange, fetchExchange } from "@urql/core";
import { retryExchange } from "@urql/exchange-retry";
import type { RRSkipFieldRule } from "../../zod";
import { RRSkipFieldRuleActionEnum } from "../../zod";
import { SalesforceRecordEnum } from "../enums";
import { SalesforceRoutingTraceService } from "../tracing";
import getAllPossibleWebsiteValuesFromEmailDomain from "../utils/getAllPossibleWebsiteValuesFromEmailDomain";
import getDominantAccountId from "../utils/getDominantAccountId";
import { GetAccountRecordsForRRSkip } from "./documents/queries";

export class SalesforceGraphQLClient {
  private log: typeof logger;
  private version = "v63.0";
  private accessToken: string;
  private client: Client;

  constructor({
    accessToken,
    instanceUrl,
  }: {
    accessToken: string;
    instanceUrl: string;
  }) {
    this.accessToken = accessToken;

    const exchanges = [cacheExchange, fetchExchange];

    if (
      process.env.SALESFORCE_GRAPHQL_DELAY_MS &&
      process.env.SALESFORCE_GRAPHQL_MAX_DELAY_MS &&
      process.env.SALESFORCE_GRAPHQL_MAX_RETRIES
    ) {
      const retryOptions = {
        maxRetries: 3,
        initialDelayMs: Number(process.env.SALESFORCE_GRAPHQL_DELAY_MS),
        maxDelayMs: Number(process.env.SALESFORCE_GRAPHQL_MAX_DELAY_MS),
        randomDelay: true,
        maxNumberAttempts: Number(process.env.SALESFORCE_GRAPHQL_MAX_RETRIES),
      };
      exchanges.push(retryExchange(retryOptions));
    }

    this.client = new Client({
      url: `${instanceUrl}/services/data/${this.version}/graphql`,
      exchanges,
      fetchOptions: () => {
        return {
          headers: { authorization: `Bearer ${this.accessToken}` },
          "Content-Type": "application/json",
        };
      },
    });
    this.log = logger.getSubLogger({ prefix: ["[SalesforceGraphQLClient]"] });
  }

  /**
   * Returns the owner of an account. There are three methods we use to the find the account owner
   * 1. If there is a contact with that matches the email, return the account owner
   * 2. If no contact is found, then find an account that is an exact match of the email domain
   * 3. If no account is found, then find contacts that match the email domain and find the account that the majority of contacts are connect to
   */
  async GetAccountRecordsForRRSkip(email: string, fieldRules?: RRSkipFieldRule[]): Promise<Contact[]> {
    const log = logger.getSubLogger({
      prefix: [`[getAccountRecordsForRRSkip]:${email}`],
    });
    const emailDomain = email.split("@")[1];
    const websites = this.getAllPossibleAccountWebsiteFromEmailDomain(emailDomain);

    // Trace query initiation
    SalesforceRoutingTraceService.graphqlQueryInitiated({
      email,
      emailDomain,
    });

    log.info(`Query against email and email domain of ${emailDomain}`);

    const hasFieldRules = fieldRules && fieldRules.length > 0;
    const fieldRuleFields = hasFieldRules ? Array.from(new Set(fieldRules.map((r) => r.field))) : [];
    log.info(`fieldRuleFields`, fieldRuleFields);

    if (hasFieldRules) {
      log.info("Using dynamic query with field rule fields", safeStringify({ fieldRuleFields, fieldRules }));
    }

    // Use dynamic query if field rules require extra fields, otherwise use static typed query
    const queryDoc = hasFieldRules
      ? this.buildDynamicAccountQuery(fieldRuleFields)
      : GetAccountRecordsForRRSkip;

    const query = await this.client.query(queryDoc, {
      email,
      websites,
      emailDomain: `%@${emailDomain}`,
    });

    const queryData = query?.data;

    if (query?.error) {
      const errors = query.error;
      if (errors.graphQLErrors.length) {
        log.error("GraphQL error", errors.graphQLErrors);
      }
      if (errors.networkError) {
        log.error("Network error", errors.networkError);
      }
    }

    if (!queryData) {
      log.error("No query data found", query?.error);
      return [];
    }

    // If there is an existing contact, return the owner of the account
    if (queryData.uiapi.query.Contact) {
      const contactEdges = queryData.uiapi.query.Contact?.edges ?? [];

      for (const edge of contactEdges) {
        const contact = edge?.node;
        if (!contact) continue;

        const accountNode = contact.Account;

        // Check field rules against the contact's account
        if (hasFieldRules && accountNode) {
          const failedRule = this.getFailingFieldRule(accountNode, fieldRules);
          if (failedRule) {
            log.info(`Contact ${contact.Id}'s account filtered out by field rules, checking next contact`);
            SalesforceRoutingTraceService.fieldRuleFilteredRecord({
              tier: "contact",
              recordId: contact.Id,
              reason: "Contact's account filtered out by field rules",
              failedRule: { field: failedRule.field, value: failedRule.value, action: failedRule.action },
            });
            continue;
          }
        }

        log.info(`Existing contact found with id ${contact.Id}`);
        SalesforceRoutingTraceService.graphqlExistingContactFound({
          contactId: contact.Id,
          accountId: contact.AccountId?.value || contact.Id,
          ownerEmail: contact.Account?.Owner?.Email?.value || "",
        });
        return [
          {
            id: contact.AccountId?.value || contact.Id,
            email: contact.Email?.value,
            ownerId: contact.Account?.Owner?.Id,
            ownerEmail: contact.Account?.Owner?.Email?.value,
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ];
      }
    }

    // If no contact is found, query for accounts based on website field
    if (queryData.uiapi.query.Account) {
      const accountEdges = queryData.uiapi.query.Account?.edges ?? [];

      for (const edge of accountEdges) {
        const account = edge?.node;
        if (!account) continue;

        // Check field rules against the account
        if (hasFieldRules) {
          const failedRule = this.getFailingFieldRule(account, fieldRules);
          if (failedRule) {
            log.info(`Account ${account.Id} filtered out by field rules, checking next account`);
            SalesforceRoutingTraceService.fieldRuleFilteredRecord({
              tier: "account",
              recordId: account.Id,
              reason: "Account filtered out by field rules",
              failedRule: { field: failedRule.field, value: failedRule.value, action: failedRule.action },
            });
            continue;
          }
        }

        log.info(
          `Existing account with website that matches email domain of ${emailDomain} found with id ${account.Id}`
        );
        SalesforceRoutingTraceService.graphqlAccountFoundByWebsite({
          accountId: account.Id,
          ownerEmail: account.Owner?.Email?.value || "",
        });
        return [
          {
            id: account.Id,
            email: "",
            ownerId: account.Owner?.Id,
            ownerEmail: account.Owner?.Email?.value,
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ];
      }
    }

    // If no account is found, find an account based on existing contacts
    if (queryData.uiapi.query.relatedContacts) {
      const relatedContactsResults = queryData.uiapi.query.relatedContacts?.edges;

      if (!relatedContactsResults) return [];

      // Collect all valid related contacts and store their Account nodes for field rule checks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountNodesByAccountId = new Map<string, Record<string, any>>();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - in CD/CI pipeline this will have any type
      const relatedContacts = relatedContactsResults.reduce(
        (contacts, edge) => {
          const node = edge?.node;
          if (!node) {
            log.error("A related contact query didn't include a node");
            return contacts;
          }
          if (!node.AccountId?.value) {
            log.error(`A related contact with id ${node.Id} didn't have an account id`);
            return contacts;
          }
          if (!node.Account?.Owner?.Id) {
            log.error(`A related contact with id ${node.Id} didn't have an account owner id`);
            return contacts;
          }
          if (!node.Account?.Owner?.Email?.value) {
            log.error(`A related contact with id ${node.Id} didn't have an account owner email`);
            return contacts;
          }

          // Store the Account node for field rule evaluation later
          if (!accountNodesByAccountId.has(node.AccountId.value)) {
            accountNodesByAccountId.set(node.AccountId.value, node.Account);
          }

          contacts.push({
            id: node.Id,
            AccountId: node.AccountId.value,
            ownerId: node.Account.Owner.Id,
            ownerEmail: node.Account.Owner.Email.value,
          });

          return contacts;
        },
        [] as {
          id: string;
          AccountId: string;
          ownerId: string;
          ownerEmail: string;
        }[]
      );

      // Trace searching by contact domain
      SalesforceRoutingTraceService.graphqlSearchingByContactDomain({
        emailDomain,
        contactCount: relatedContacts.length,
      });

      if (relatedContacts.length === 0) {
        SalesforceRoutingTraceService.graphqlNoAccountFound({
          email,
          reason: "No valid related contacts found",
        });
        return [];
      }

      // Rank accounts by contact count (most contacts first)
      const accountCounts = new Map<string, number>();
      for (const contact of relatedContacts) {
        accountCounts.set(contact.AccountId, (accountCounts.get(contact.AccountId) || 0) + 1);
      }
      const rankedAccountIds = Array.from(accountCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([accountId]) => accountId);

      // Try each account in order of dominance, applying field rules
      for (const accountId of rankedAccountIds) {
        // Check field rules against the account node
        if (hasFieldRules) {
          const accountNode = accountNodesByAccountId.get(accountId);
          if (accountNode) {
            const failedRule = this.getFailingFieldRule(accountNode, fieldRules);
            if (failedRule) {
              log.info(`Dominant account ${accountId} filtered out by field rules, trying next account`);
              SalesforceRoutingTraceService.fieldRuleFilteredRecord({
                tier: "related_contacts",
                recordId: accountId,
                reason: "Dominant account filtered out by field rules",
                failedRule: { field: failedRule.field, value: failedRule.value, action: failedRule.action },
              });
              continue;
            }
          }
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - in CD/CI pipeline this will have any type
        const contactUnderAccount = relatedContacts.find((contact) => contact.AccountId === accountId);
        if (!contactUnderAccount) {
          log.error(
            `Could not find a contact under account id ${accountId}`,
            safeStringify({ relatedContacts })
          );
          continue;
        }

        // Trace account selection
        const contactsUnderAccount = relatedContacts.filter(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          (contact) => contact.AccountId === accountId
        );
        SalesforceRoutingTraceService.graphqlDominantAccountSelected({
          accountId,
          contactCount: contactsUnderAccount.length,
          ownerEmail: contactUnderAccount.ownerEmail,
        });

        log.info(`Account found via related contacts with account id ${accountId}`);
        return [
          {
            id: accountId,
            email: "",
            ownerId: contactUnderAccount.ownerId,
            ownerEmail: contactUnderAccount.ownerEmail,
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ];
      }

      log.info("All related contact accounts filtered out by field rules");
      SalesforceRoutingTraceService.graphqlNoAccountFound({
        email,
        reason: "All accounts filtered out by field rules",
      });
      return [];
    }

    log.info("No account found for attendee");
    SalesforceRoutingTraceService.graphqlNoAccountFound({
      email,
      reason: "No account found via any tier",
    });
    return [];
  }

  /**
   * Checks whether an Account node passes all configured field rules.
   * Account nodes use the UIAPI pattern where field values are wrapped in { value }.
   *
   * @returns `null` if all rules pass, or the first failing rule if filtered.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getFailingFieldRule(
    accountNode: Record<string, any>,
    fieldRules: RRSkipFieldRule[]
  ): RRSkipFieldRule | null {
    const log = logger.getSubLogger({ prefix: [`[getFailingFieldRule]`] });

    for (const rule of fieldRules) {
      const fieldData = accountNode[rule.field];
      const actualValue = String(fieldData?.value ?? "").toLowerCase();
      const ruleValue = rule.value.toLowerCase();
      const matches = actualValue === ruleValue;

      log.info(
        `Evaluating rule: field="${rule.field}" action="${
          rule.action
        }" ruleValue="${ruleValue}" actualValue="${actualValue}" rawFieldData=${safeStringify(
          fieldData
        )} matches=${matches}`
      );

      if (rule.action === RRSkipFieldRuleActionEnum.IGNORE && matches) {
        log.info(`FILTERED: ignore rule matched — field "${rule.field}" equals "${ruleValue}"`);
        SalesforceRoutingTraceService.fieldRuleEvaluated({
          field: rule.field,
          action: rule.action,
          ruleValue,
          actualValue,
          matches,
          result: "filtered",
        });
        return rule;
      }

      if (rule.action === RRSkipFieldRuleActionEnum.MUST_INCLUDE && !matches) {
        log.info(
          `FILTERED: must_include rule failed — field "${rule.field}" is "${actualValue}", expected "${ruleValue}"`
        );
        SalesforceRoutingTraceService.fieldRuleEvaluated({
          field: rule.field,
          action: rule.action,
          ruleValue,
          actualValue,
          matches,
          result: "filtered",
        });
        return rule;
      }
    }
    log.info("All field rules passed");
    return null;
  }

  /**
   * Builds a GraphQL query string that includes additional Account fields
   * for field rule evaluation. Mirrors the static GetAccountRecordsForRRSkip query
   * but injects extra fields into all Account selections.
   */
  private buildDynamicAccountQuery(fieldRuleFields: string[]): string {
    const extraFields = fieldRuleFields.map((field) => `${field} { value }`).join("\n              ");

    return `
      query GetAccountRecordsForRRSkipWithFields($email: Email!, $websites: [Url!]!, $emailDomain: Email!) {
        uiapi {
          query {
            Contact(where: { Email: { eq: $email } }) {
              edges {
                node {
                  Id
                  Email { value }
                  OwnerId { value }
                  AccountId { value }
                  Account {
                    Website { value }
                    Owner {
                      Id
                      Email { value }
                    }
                    ${extraFields}
                  }
                }
              }
            }
            Account(where: { Website: { in: $websites } }) {
              edges {
                node {
                  Id
                  Website { value }
                  Owner {
                    Id
                    Email { value }
                  }
                  ${extraFields}
                }
              }
            }
            relatedContacts: Contact(
              where: {
                and: [
                  { Email: { like: $emailDomain } }
                  { Email: { ne: $email } }
                  { AccountId: { ne: null } }
                ]
              }
            ) {
              edges {
                node {
                  Id
                  Email { value }
                  AccountId { value }
                  Account {
                    Id
                    Owner {
                      Id
                      Email { value }
                    }
                    ${extraFields}
                  }
                }
              }
            }
          }
        }
      }
    `;
  }

  private getAllPossibleAccountWebsiteFromEmailDomain(emailDomain: string) {
    return getAllPossibleWebsiteValuesFromEmailDomain(emailDomain);
  }
}
