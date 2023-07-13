# Test Plan for "Organizations" Feature

## 1. Testing Scope

- The testing will focus on verifying the functionality of the "Organizations" feature
- It includes testing the ability to create organizations, teams, and managing access rights within the Cal.com web application
- It includes testing the ability to have members (owner, admin and members) into organizations and teams and moving between them
- It includes testing the ability to scheduling individually, from organization side and team side
- The testing will be conducted on the `app.cal.dev` environment
- The stack used is Next.js, JS/TS, Prisma, and Playwright

## 2. Skill Level of Specialists

- The testing team has two QA engineers, both with software development experience
- They are familiar with testing frameworks and tools used for automated testing

## 3. Testing Stages

### a) General Testing

- Functional testing:
  - Verify that the UI allows managing organizations
  - Verify that the UI allows managing teams inside organization
  - Verify that the UI allows managing members into organization and teams
  - Verify that the UI allows managing access rights between organizations, teams and members
  - Verify that the UI allows managing event types individually, for organizations and for teams
  - Verify that the UI allows managing bookings individually, for organizations and for teams
  - Verify that the UI allows managing apps individually, for organizations and for teams

### b) E2E Testing

- TBD

### c) Automated Testing

- TBD

## 4. Tools

- Checkly: Use Checkly to write the sanity testing for Organizations.
- Test management tool: Use Linear or GitHub to register defects

## 5. Risks and Contingencies

- Risk: Organization and team access rights may not be properly enforced, leading to unauthorized access. Members from different teams/organizations cannot see each other, only the instance admin
  Contingency: Verify that organizations and teams have the appropriate access restrictions and members cannot access other organizations' teams.

## 6. Entry/Exit Criteria

### Entry Criteria

- The development team has implemented the "Organizations" feature.
- The feature has undergone code review and meets the acceptance criteria.

### Exit Criteria

- All test cases from General testing have been executed and passed.
- Any identified defects have been reported, tracked, and resolved.
- The creation of organizations, teams, members and access rights has been validated and meets the specified requirements.

## 7. Test Approach

### Manual Testing

- Manually verify that the UI allows managing organizations, teams, members, event types, bookings, apps, and managing access rights.
- Test different scenarios of creating, editing, deleting organizations, teams, members, event types, bookings, apps and verifying access restrictions.

### Automated Testing

- Write checks in Checkly to cover the sanity part of this plan
  - Create organizations
  - Create teams inside organizations
  - Add member to organizations and teams
- Automate different test scenarios to cover a wide range of organization and team creation cases, access rights assignment, and access restriction verification.

Note: The specific test cases and their detailed steps should be documented separately in a test case management tool or test documentation.
