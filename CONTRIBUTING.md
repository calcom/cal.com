# Core Contributors
Emoji | Meaning |
-- | -- |
✅ | has knowledge |
🥇 | is their main priority |
⚠️ | is the only one with knowledge |
👀 | has no knowledge but wants to be onboarded |

> tip: hover over the abbreviation for the full title

Core Team | <span title="Availability">AV</span> | <span title="Timezones">![](https://rotate-svg-text-agu.vercel.app/api/rotate?text=Timezones&color=white&size=14#gh-dark-mode-only)![](https://rotate-svg-text-agu.vercel.app/api/rotate?text=Timezones&color=black&size=14#gh-light-mode-only)</span> | <span title="App Store">AS</span> | <span title="Teams">TM</span> | <span title="Booking Page">BP</span> | <span title="Turbo Repo">TR</span> | <span title="End-to-end testing">E2E</span> | <span title="Webhooks">WH</span> | <span title="Event-Types">ET</span> | <span title="Prisma">PR</span> | <span title="Billing (Stripe)">BL</span> | <span title="Authentication">Auth</span> | Stripe App | Google Cal | tRPC | SSO / SAML | CalDAV | Outlook App | Slack App | <span title="Public API">API</span> | <span title="Recurring Event">RE</span> | Seats | Zapier | Embeds | <span title="Admin Console">AC</span> | <span title="Workflows">WF</span>
-- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | --
@PeerRich  |   |   |   |   | 👀 | 👀 |   |   | ✅ |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |  
@baileypumfleet  |   |   | ✅ |   | ✅ | 👀 |   |   |   |   |   |   |   | ✅ |   |   |   |   |   |   |   |   |   |   |   |  
@zomars  |   |   | 🥇✅ |   | ✅ | ✅ | ✅ |   | ✅ | ✅ | ✅ | ✅ | ✅ |   | ✅ | 👀 |   |   |   |   |   |   |   |   |   |  
@emrysal  | 🥇✅ | 🥇✅ |   | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |   |   |   | ✅ | ✅ |   |   |   |   |   |   |   |   |   |   |  
@alannnc  | ✅ | 🥇✅ |   |   | ✅ | 👀 | ✅ |   | ✅ | ✅ | 🥇✅ | ✅ | ✅ | 👀 | ✅ | ✅ |   |   |   |   |   |   |   |   |   |  
@agustif  |   |   | 👀 |   | ✅ | ✅ | 👀 |   | 👀 | ✅ | ✅ | 🥇✅ | 👀 |   | ✅ | 🥇✅ |   |   |   | 🥇✅ |   |   |   |   |   |  
@leog  | 👀 |   | ✅ | 👀 |   | 👀 |   | 👀 | ✅ |   |   |   | 👀 |   | 👀 |   |   | 👀 |   |   | ✅⚠️ |   |   |   |   |  
@joeauyeung  |   |   | ✅ | 👀 |   |   |   |   | ✅👀 | ✅👀 | ✅👀 |   |   |   |   | 👀 |   | ✅ |   |   |   | ✅⚠️ |   |   |   |  
@alishaz-polymath  | ✅ | ✅ | 👀 | ✅ | ✅ |   | ✅ | ✅ | ✅ | ✅👀 |   | ✅👀 | 👀 | 👀 | ✅ |   | 👀 | 👀 |   | ✅ |   |   |   |   |   |  
@hariombalhara  |   |   |   |   |   |   | ✅ |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   | ✅⚠️ |   |  
@CarinaWolli  |   |   |   |   |   |   |   | ✅ | ✅ |   |   |   |   |   |   |   |   |   |   |   |   |   | ✅⚠️ |   |   | ✅⚠️
@sean-brydon  |   |   | ✅ |   |   | 👀 | ✅ | 👀 |   | ✅ |   | 👀 |   |   | ✅ | 👀 | 👀 |   | 🥇✅⚠️ |   |   |   |   |   |   |  



# Contributing to Cal.com

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

- Before jumping into a PR be sure to search [existing PRs](https://github.com/calcom/cal.com/pulls) or [issues](https://github.com/calcom/cal.com/issues) for an open or closed item that relates to your submission.

## Developing

The development branch is `main`. This is the branch that all pull
requests should be made against. The changes on the `main`
branch are tagged into a release monthly.

To develop locally:

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your
   own GitHub account and then
   [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device.
2. Create a new branch:

   ```sh
   git checkout -b MY_BRANCH_NAME
   ```

3. Install yarn:

   ```sh
   npm install -g yarn
   ```

4. Install the dependencies with:

   ```sh
   yarn
   ```

5. Start developing and watch for code changes:

   ```sh
   yarn dev
   ```

## Building

You can build the project with:

```bash
yarn build
```

Please be sure that you can make a full production build before pushing code.

## Testing

More info on how to add new tests coming soon.

### Running tests

This will run and test all flows in multiple Chromium windows to verify that no critical flow breaks:

```sh
yarn test-e2e
```

## Linting

To check the formatting of your code:

```sh
yarn lint
```

If you get errors, be sure to fix them before committing.

## Making a Pull Request

- Be sure to [check the "Allow edits from maintainers" option](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/allowing-changes-to-a-pull-request-branch-created-from-a-fork) while creating you PR.
- If your PR refers to or fixes an issue, be sure to add `refs #XXX` or `fixes #XXX` to the PR description. Replacing `XXX` with the respective issue number. Se more about [Linking a pull request to an issue
  ](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue).
- Be sure to fill the PR Template accordingly.
