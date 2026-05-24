/**
 * 需要自定义 setup form 的 app slug 列表
 * 这些 app 不是 OAuth 类型，但有自定义凭证表单，
 * 需要走 setup form 流程而非自动安装流程
 */
export const APPS_WITH_SETUP_FORM: string[] = ["bigbluebutton"];

/**
 * 判断指定 app 是否需要 setup form
 */
export function appRequiresSetupForm(slug: string): boolean {
  return APPS_WITH_SETUP_FORM.includes(slug);
}

/**
 * 为需要 setup form 的 app 返回重定向对象
 * 如果 app 不需要 setup form，返回 null
 */
export function setupFormRedirectFor(slug: string): {
  redirect: { permanent: boolean; destination: string };
} | null {
  if (appRequiresSetupForm(slug)) {
    return {
      redirect: {
        permanent: false,
        destination: `/apps/${slug}/setup`,
      },
    };
  }
  return null;
}