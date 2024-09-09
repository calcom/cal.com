import type * as OAuthManager from "../../_utils/oauth/OAuthManager";
declare const oAuthManagerMock: {
    TokenStatus: import("vitest-mock-extended").DeepMockProxy<typeof OAuthManager.TokenStatus>;
    OAuthManager: import("vitest-mock-extended").DeepMockProxy<typeof OAuthManager.OAuthManager>;
} & typeof OAuthManager;
export default oAuthManagerMock;
declare const defaultMockOAuthManager: import("@vitest/spy").Mock<any, any>;
export { oAuthManagerMock, defaultMockOAuthManager };
//# sourceMappingURL=OAuthManager.d.ts.map