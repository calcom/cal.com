import { faker } from "@faker-js/faker";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import escapeStringRegexp from "escape-string-regexp";

import MailClient from "../lib/mail-client";
import type { NamespaceMode } from "../lib/mail-server";
import { DEFAULT_NAMESPACE_MODE } from "../lib/mail-server";

// eslint-disable-next-line turbo/no-undeclared-env-vars
export const parallelWorkerNamespace = `${process.env.TEST_WORKER_INDEX}-${process.env.TEST_PARALLEL_INDEX}`;

export const generateNamespacedEmailAddress = (mode: NamespaceMode) => {
  switch (mode) {
    case "prepend":
      return `${parallelWorkerNamespace}${faker.internet.email()}`;
    case "subdomain":
      return faker.internet.email({
        provider: `${parallelWorkerNamespace}.${faker.internet.domainName()}`,
      });
  }
};

const DEFAULT_TIMEOUT = 5000;

export class EmailsFixture {
  constructor(page: Page, namespaced = true, mode?: NamespaceMode) {
    this.namespace = namespaced ? parallelWorkerNamespace : "";
    this.namespaceMode = mode ?? DEFAULT_NAMESPACE_MODE;
    this.mailClient = new MailClient(this.namespace, this.namespaceMode);
    this.page = page;
  }

  private mailClient: MailClient;
  private namespace: string;
  private namespaceMode: NamespaceMode;
  private page: Page;

  start = () => this.mailClient.start();
  stop = () => this.mailClient.stop();

  generateAddress = () => generateNamespacedEmailAddress(this.namespaceMode).toLowerCase();

  waitForOne = async (opts: string | Record<string, string>, { timeout = DEFAULT_TIMEOUT } = {}) => {
    const email = await this.mailClient.waitForEmail(opts, { timeout });
    let hasBeenOpened = false;

    const getCallToAction = () => {
      const cta = this.page.getByTestId("cta-link");
      cta.click = async () => {
        expect(hasBeenOpened).toBeTruthy();
        const ctaHref = await cta.getAttribute("href", {
          timeout: DEFAULT_TIMEOUT,
        });
        expect(ctaHref).not.toBeNull();
        await this.page.goto(ctaHref as string);
      };
      return cta;
    };

    const open = async () => {
      expect(email.html).toBeTruthy();
      hasBeenOpened = true;
      // creates a history entry to make page.goBack() work as expected
      await this.page.goto("about:blank");
      return this.page.setContent(email.html);
    };

    return {
      ...email,
      clickCta: async () => {
        await open();
        return getCallToAction().click();
      },
      // quick way to get a link via partial string match, e.g. findHref("verify") -> "https://example.com/verify-email"
      findHref: (partial: string) =>
        email.text.match(new RegExp(`https?://\\S*${escapeStringRegexp(partial)}\\S*`))?.[0] || "",
      open,
    };
  };

  // FIXME: improve error output for multiple failed emails (allSettled)
  waitForMany = (opts: (string | Record<string, string>)[], { timeout = DEFAULT_TIMEOUT } = {}) =>
    Promise.all(opts.map((opts) => this.waitForOne(opts, { timeout })));
}

export const createEmailsFixture = (...args: ConstructorParameters<typeof EmailsFixture>) =>
  new EmailsFixture(...args);
