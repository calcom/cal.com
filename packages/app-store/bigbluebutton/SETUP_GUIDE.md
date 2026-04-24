# BigBlueButton 集成 - 安装指南

## 快速开始

### 1. 复制代码到 Cal.com

```bash
# 假设你已克隆 cal.diy 仓库
cd cal.diy

# 创建目录
mkdir -p packages/app-store/bigbluebutton

# 复制所有文件
cp -r /path/to/bigbluebutton-integration/* packages/app-store/bigbluebutton/
```

### 2. 注册应用到 App Store

编辑 `packages/app-store/index.ts`，添加：

```typescript
export { default as bigbluebutton } from "./bigbluebutton";
```

### 3. 安装依赖

```bash
yarn install
```

### 4. 运行测试

```bash
yarn test packages/app-store/bigbluebutton
```

### 5. 启动开发服务器

```bash
yarn dev
```

## 配置说明

### 获取 BigBlueButton 凭证

1. **自有服务器**：
   ```bash
   ssh your-bbb-server
   sudo bbb-conf --secret
   ```
   输出包含：
   - URL: `https://your-server/bigbluebutton/`
   - Secret: `your-shared-secret`

2. **测试服务器**（开发用）：
   - 使用 https://test.bigbluebutton.org/
   - 申请测试账号

### 在 Cal.com 中配置

1. 访问 `/apps/bigbluebutton`
2. 点击 "Install"
3. 输入服务器 URL 和 Secret
4. 点击 "Connect"

## 文件结构

```
packages/app-store/bigbluebutton/
├── index.ts                    # 应用元数据
├── config.json                 # 应用配置
├── DESCRIPTION.md              # 用户文档
├── package.json                # 依赖
├── PR_DESCRIPTION.md           # PR描述模板
├── SETUP_GUIDE.md             # 本文件
├── api/
│   └── index.ts               # API路由
├── components/
│   └── InstallAppButton.tsx   # 安装界面
├── lib/
│   └── VideoApiAdapter.ts     # BBB API封装
├── static/
│   └── icon.svg               # 应用图标
└── test/
    └── VideoApiAdapter.test.ts # 测试
```

## 提交 PR 步骤

### 1. Fork 仓库

访问 https://github.com/calcom/cal.diy/fork

### 2. 添加远程仓库

```bash
git remote add myfork https://github.com/YOUR_USERNAME/cal.diy.git
```

### 3. 创建分支

```bash
git checkout -b feat/bigbluebutton-integration
```

### 4. 提交代码

```bash
git add packages/app-store/bigbluebutton/
git commit -m "feat: add BigBlueButton integration

- Add BigBlueButton video conferencing support
- Implement create/update/delete meeting APIs
- Add connection health check
- Include unit tests

Closes #1985"
```

### 5. 推送到你的 Fork

```bash
git push myfork feat/bigbluebutton-integration
```

### 6. 创建 PR

访问 https://github.com/calcom/cal.diy/pulls

- 标题: `feat: Add BigBlueButton Integration`
- 描述: 复制 `PR_DESCRIPTION.md` 内容
- 关联 Issue: #1985
- 添加标签: `💎 Bounty`

### 7. 认领赏金

在 PR 描述中添加：
```
/claim $50
```

## 测试清单

- [ ] 单元测试通过
- [ ] 能成功连接到 BBB 测试服务器
- [ ] 创建会议时生成正确的 join URL
- [ ] 会议密码正确生成
- [ ] 错误处理正常工作

## 常见问题

### Q: 如何获取 BBB 测试服务器？
A: 访问 https://test.bigbluebutton.org/ 申请测试账号

### Q: API 调用失败？
A: 检查：
1. URL 格式正确（包含 https://）
2. Secret 没有多余空格
3. BBB 服务器可访问

### Q: 如何调试？
A: 查看浏览器 Network 标签，检查 API 响应

## 相关链接

- Issue: https://github.com/calcom/cal.diy/issues/1985
- BBB API 文档: https://docs.bigbluebutton.org/development/api/
- Algora 赏金: https://algora.io
