const TwoFactorAuthAPI = {
  async setup(password: string) {
    return fetch("/api/auth/two-factor/totp/setup", {
      method: "POST",
      body: JSON.stringify({ password }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  async enable(code: string) {
    return fetch("/api/auth/two-factor/totp/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  async disable(password: string, code: string, backupCode: string) {
    return fetch("/api/auth/two-factor/totp/disable", {
      method: "POST",
      body: JSON.stringify({ password, code, backupCode }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
};

export default TwoFactorAuthAPI;
