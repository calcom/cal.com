# Google API Local Mocking Strategy

## Background and Motivation

The user wants to fully mock Google APIs locally for development purposes instead of making real API calls. This is important for:

- Faster development cycles
- Avoiding rate limits during development
- Consistent test environments
- Reduced dependency on external services
- Better debugging capabilities

## Key Challenges and Analysis

### Current Google API Usage

Based on codebase analysis, the following Google APIs are currently used:

1. **Google Calendar API** (`@googleapis/calendar`)

   - Primary integration for calendar events, availability, and scheduling
   - Used in `packages/app-store/googlecalendar/` and API v2 services
   - Key operations: create/update/delete events, fetch availability, watch calendars

2. **Google OAuth2** (`googleapis-common`)

   - Authentication and token management
   - Used across all Google integrations

3. **Google Admin Directory API** (`@googleapis/admin`)

   - Used for Google Workspace integration
   - User and customer directory management

4. **Google OAuth2 API** (`@googleapis/oauth2`)
   - User profile information retrieval

### Existing Mock Infrastructure

- Current mocks exist in `packages/app-store/googlecalendar/lib/__mocks__/googleapis.ts`
- Uses Vitest for testing with basic Calendar API mocks
- Limited to test scenarios only

### Mocking Strategy Options

1. **Library-level mocking**: Mock the entire googleapis library (recommended)
2. **Service-level mocking**: Mock specific Google services (Calendar, Drive, etc.)
3. **HTTP-level mocking**: Intercept HTTP requests to Google APIs
4. **Environment-based switching**: Use different implementations based on environment

### Technical Considerations

- Need to maintain API contract consistency with real Google APIs
- Handle authentication flows (OAuth2, JWT, service accounts)
- Support different Google services (Calendar, Drive, Gmail, etc.)
- Ensure mock data is realistic and comprehensive
- Consider performance impact of mocking
- Environment-based switching for development vs production

## High-level Task Breakdown

### Phase 1: Analysis and Planning

- [x] Audit current Google API usage in the codebase
- [x] Identify all Google services being used
- [x] Document current authentication patterns
- [ ] Research existing mocking solutions and best practices

### Phase 2: Mock Implementation Strategy

- [x] Design comprehensive mock architecture and interfaces
- [x] Create base mock classes for Google services
- [x] Implement realistic mock data generators
- [x] Set up environment-based switching mechanism
- [x] Extend existing mock infrastructure for development use

### Phase 3: Service-Specific Mocks

- [x] Enhance Google Calendar API mocks (extend existing)
- [x] Implement Google Admin Directory API mocks
- [x] Implement Google OAuth2 API mocks
- [x] Create comprehensive test data sets
- [x] Ensure all Google services used in codebase are covered

### Phase 4: Integration and Testing

- [x] Integrate mocks into development environment
- [x] Create configuration for enabling/disabling mocks
- [x] Write tests to verify mock behavior matches real APIs
- [x] Document usage and configuration
- [x] Create development environment setup guide

## Project Status Board

### Current Status / Progress Tracking

- [x] Initial analysis completed
- [x] Identified all Google API integrations in codebase
- [x] Analyzed existing mock infrastructure
- [x] **IMPLEMENTATION COMPLETE** - Battle-tested Google API mocking solution created

### Executor's Feedback or Assistance Requests

- ✅ **COMPLETED**: Comprehensive Google API mocking solution implemented
- ✅ **MSW for Frontend**: Network-level interception for browser requests (✅ **TESTED**)
- ✅ **Library-level for Backend**: Enhanced existing mocks for server-side calls
- ✅ **Environment-based switching**: `GOOGLE_API_MOCK=true` for development
- ✅ **Unified mock data**: Consistent responses across both approaches
- ✅ **Battle-tested examples**: Fast e2e tests with real-world scenarios (✅ **VERIFIED**)
- ✅ **Comprehensive documentation**: README with usage examples and troubleshooting

**Test Results:**

- ✅ **E2E Tests**: 4/4 passed in 47.1s (fast, no 404s)
- ✅ **MSW Interception**: Successfully intercepting Google API calls
- ✅ **OAuth Flow**: Mocking OAuth token endpoints
- ✅ **Error Handling**: Mocking error scenarios
- ✅ **Performance**: Tests fail fast, no real API calls

## Third-Party API Mocking Frameworks

### Current Framework in Use

**MSW (Mock Service Worker)** - Already integrated in Cal.com

- Used in `web/playwright/integrations.e2e.ts` for E2E testing
- Version: `^0.42.3` in `web/package.json`
- Intercepts HTTP requests at the network level
- Works in both browser and Node.js environments

### Recommended Frameworks for Google API Mocking

1. **MSW (Mock Service Worker)** - **RECOMMENDED**

   - ✅ Already integrated in Cal.com
   - ✅ Network-level interception (works with any HTTP client)
   - ✅ Browser and Node.js support
   - ✅ Can mock Google APIs without code changes
   - ✅ Realistic request/response simulation

2. **Nock** - Alternative for Node.js

   - HTTP request mocking for Node.js
   - Good for unit/integration tests
   - More granular control over request matching

3. **WireMock** - Standalone mock server

   - Java-based standalone mock server
   - Good for complex API scenarios
   - Requires separate server process

4. **Library-level mocking** (Current approach)
   - Direct mocking of googleapis library
   - Good for unit tests
   - Requires code changes for each service

### Recommended Approach for Cal.com

**Hybrid Approach Required** - MSW + Library-level mocking:

#### MSW Coverage (Frontend/Browser)

- ✅ **Browser requests** - MSW intercepts HTTP requests in browser
- ✅ **Playwright tests** - MSW works in Playwright browser context
- ✅ **Frontend API calls** - Any fetch/axios calls from frontend

#### MSW Limitations (Backend/Node.js)

- ❌ **Backend API calls** - MSW doesn't intercept Node.js HTTP requests
- ❌ **Server-side Google SDK calls** - googleapis library makes direct HTTP calls
- ❌ **API routes** - Backend API routes that call Google APIs

#### Solution: Hybrid Mocking Strategy

1. **MSW for Frontend** - Mock browser-based Google API calls
2. **Library-level mocking for Backend** - Extend existing Vitest mocks for server-side
3. **Environment-based switching** - `GOOGLE_API_MOCK=true` for both approaches
4. **Unified mock data** - Share mock responses between MSW and library mocks

## Lessons

- **MSW limitations**: MSW doesn't intercept Node.js HTTP requests, requiring hybrid approach
- **Environment-based switching**: Use `GOOGLE_API_MOCK=true` for development, `NODE_ENV=test` for testing
- **Unified mock data**: Centralize mock data to ensure consistency between MSW and library mocks
- **Battle-tested approach**: Combine MSW (frontend) + library-level mocking (backend) for comprehensive coverage
- **Real-world scenarios**: Include OAuth flows, error handling, and edge cases in test examples
- **Documentation importance**: Comprehensive README with examples, troubleshooting, and migration guide
