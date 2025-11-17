import { Client, cacheExchange, fetchExchange } from "@urql/core";
import { retryExchange } from "@urql/exchange-retry";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Contact } from "@calcom/types/CrmService";

import { SalesforceRecordEnum } from "../enums";
import getAllPossibleWebsiteValuesFromEmailDomain from "../utils/getAllPossibleWebsiteValuesFromEmailDomain";
import getDominantAccountId from "../utils/getDominantAccountId";
import { GetAccountRecordsForRRSkip } from "./documents/queries";

export class SalesforceGraphQLClient {
  private log: typeof logger;
  private version = "v63.0";
  private accessToken: string;
  private client: Client;

  constructor({ accessToken, instanceUrl }: { accessToken: string; instanceUrl: string }) {
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
  async GetAccountRecordsForRRSkip(email: string): Promise<Contact[]> {
    const log = logger.getSubLogger({ prefix: [`[getAccountRecordsForRRSkip]:${email}`] });
    const emailDomain = email.split("@")[1];
    const websites = this.getAllPossibleAccountWebsiteFromEmailDomain(emailDomain);

    log.info(`Query against email and email domain of ${emailDomain}`);

    const query = await this.client.query(GetAccountRecordsForRRSkip, {
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
      const contact = queryData.uiapi.query.Contact?.edges?.[0]?.node;

      if (contact) {
        log.info(`Existing contact found with id ${contact.Id}`);
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
      const account = queryData.uiapi.query.Account?.edges?.[0]?.node;
      if (account) {
        log.info(
          `Existing account with website that matches email domain of ${emailDomain} found with id ${account.Id}`
        );
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - in CD/CI pipeline this will have any type
      const relatedContacts = relatedContactsResults.reduce((contacts, edge) => {
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

        contacts.push({
          id: node.Id,
          AccountId: node.AccountId.value,
          ownerId: node.Account.Owner.Id,
          ownerEmail: node.Account.Owner.Email.value,
        });

        return contacts;
      }, [] as { id: string; AccountId: string; ownerId: string; ownerEmail: string }[]);

      const dominantAccountId = getDominantAccountId(relatedContacts);

      if (!dominantAccountId) {
        log.error(
          "Could not find dominant account id with the following contacts",
          safeStringify({ relatedContacts })
        );
        return [];
      }

      // Get a contact from the dominant account
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - in CD/CI pipeline this will have any type
      const contactUnderAccount = relatedContacts.find((contact) => contact.AccountId === dominantAccountId);
      if (!contactUnderAccount) {
        log.error(
          `Could not find a contact under the dominant account id ${dominantAccountId}`,
          safeStringify({ relatedContacts })
        );
        return [];
      }

      log.info(`Account found via related contacts with account id ${dominantAccountId}`);
      return [
        {
          id: dominantAccountId,
          email: "",
          ownerId: contactUnderAccount.ownerId,
          ownerEmail: contactUnderAccount.ownerEmail,
          recordType: SalesforceRecordEnum.ACCOUNT,
        },
      ];
    }

    log.info("No account found for attendee");
    return [];
  }

  private getAllPossibleAccountWebsiteFromEmailDomain(emailDomain: string) {
    return getAllPossibleWebsiteValuesFromEmailDomain(emailDomain);
  }
}
