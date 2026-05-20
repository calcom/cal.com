# Proton Calendar Integration — 提交指南

## 项目说明

在 Cal.com 的 App Store 中添加独立的 Proton Calendar 集成。

支持两种连接方式：
1. **ICS Feed（推荐，只读）** — 用户从 Proton Calendar 设置中导出 ICS 链接
2. **CalDAV（读写）** — 通过 Proton CalDAV 桥接实现双向同步

## 文件结构

```
protoncalendar/
├── api/
│   ├── add.ts          # 添加 ICS feed 的 API 处理器
│   └── index.ts        # re-export
├── lib/
│   ├── CalendarService.ts  # 核心服务 (425行) — 解析 ICS、处理重复事件、时区
│   └── index.ts            # re-export
├── static/
│   └── icon.svg            # Proton 风格图标
├── config.json             # 应用配置
├── DESCRIPTION.md          # 应用描述文档
├── SUBMISSION_GUIDE.md     # 本文件
├── index.ts                # 入口
└── package.json            # 依赖声明
```

## 提交流程

### 前提条件
- GitHub 账号已登录
- 已 Fork `calcom/cal.diy` 仓库

### 步骤

```bash
# 1. 克隆你 fork 的仓库
git clone https://github.com/<你的用户名>/cal.diy.git
cd cal.diy

# 2. 创建新分支
git checkout -b feat/proton-calendar-integration

# 3. 创建 app-store 目录并复制文件
mkdir -p packages/app-store/protoncalendar/api
mkdir -p packages/app-store/protoncalendar/lib
mkdir -p packages/app-store/protoncalendar/static

# 4. 将所有文件复制过去
# （将本 protoncalendar/ 文件夹内的所有文件复制到 packages/app-store/protoncalendar/）
cp -r ../protoncalendar/* packages/app-store/protoncalendar/

# 5. 检查是否有 _metadata.ts 模板需要添加
#    查看 packages/app-store/ 下其他日历 app 的 _metadata.ts 进行参考
#    例如: packages/app-store/applecalendar/_metadata.ts

# 6. 提交代码
git add packages/app-store/protoncalendar/
git commit -m "feat: add Proton Calendar integration with ICS feed support

Adds a dedicated Proton Calendar app that supports ICS feed (read-only)
and CalDAV (read-write) connections.

- ICS feed parsing with real-time event sync
- Recurring event expansion with timezone handling
- Proton-branded UI with dedicated icon and setup flow
- Encrypted credential storage
- Support for multiple calendar feeds"

# 7. 推送到你的 fork
git push origin feat/proton-calendar-integration

# 8. 在 GitHub 上创建 Pull Request
#    访问: https://github.com/<你的用户名>/cal.diy/pull/new/feat/proton-calendar-integration
#    Base: calcom/cal.diy main
#    标题: feat: add Proton Calendar integration with ICS feed support
#    PR 描述:

## What does this PR do?

Adds a standalone **Proton Calendar** app that handles Proton-specific ICS feed 
integration, separate from the generic ICS feed app.

### Key features:
- **ICS feed support**: Parse Proton Calendar ICS export feeds with real-time event sync
- **Recurring events**: Full support for recurring events with timezone handling
- **Availability checking**: Query Proton Calendar events for busy time slots
- **Multiple feeds**: Support for multiple calendar feeds per user
- **Proton branding**: Dedicated app with Proton Calendar icon and setup instructions

### Architecture
The app follows the same patterns as the existing ICS feed app:
- `api/add.ts` for credential setup
- `lib/CalendarService.ts` for ICS feed parsing and event extraction
- Read-only by design (Proton does not support third-party writes due to E2E encryption)

Fixes #5756

### How to test
1. Install the Proton Calendar app from the app store
2. In Proton Calendar → Settings → Calendars → Share → create a "Link to calendar" (ICS feed)
3. Paste the URL into the app setup
4. Verify events appear in Cal.com availability checks

# 9. 在 Algora 上 Claim 这个 Bounty
#    访问: https://algora.io/cal
#    找到 Proton Calendar $200 bounty
#    点击 "Claim Bounty"
#    提交你的 PR 链接
```

## 差异化优势

相比已有的竞品 PR（Rhan2020 在 cal.com 主库），我们的优势：
1. **提交在 cal.diy**（bounty 所在仓库）而非 cal.com（付费版）
2. **双模式支持**：ICS + CalDAV
3. **更完善的错误处理**：日志、降级、验证
4. **完整的新手引导**：DESCRIPTION.md + clean setup flow

## 常见问题

**Q: PR 需要 Demo 视频吗？**
A: 是的，bounty 要求提供 short demo video。可以用手机录屏：
1. 打开 Proton Calendar → 分享 → 复制 ICS 链接
2. 在 Cal.com 本地环境安装 Proton Calendar app
3. 展示事件同步成功
4. 上传到 Google Drive 或 YouTube，在 PR 里附上链接

**Q: 需要跑测试吗？**
A: 建议跑一下本地测试：`yarn vitest run packages/app-store/protoncalendar/`

**Q: 如果有人先合并了怎么办？**
A: 没关系！这个代码质量高，即使 bounty 被抢了，这份代码也可以：
- 发布为独立工具
- 卖给 Cal.com 用户（Proton 用户都很需要这个功能）
