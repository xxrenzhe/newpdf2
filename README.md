# newpdf2 - 一站式聚合式 PDF 工具平台（Next.js）

目标：构建一个体验优秀、功能完整的在线 PDF 工具平台，覆盖编辑、签名、格式转换、压缩等高频场景。

## 本地开发

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`

## 已实现功能（可用）

- `Annotate / Edit`：基于 `react-pdf` + `fabric` 的标注/叠加式编辑（可导出到新 PDF）
- `Sign`：签名板绘制签名（PNG），写入 PDF 指定页（可下载）
- `Convert`
  - PDF → 图片（PNG/JPG，打包 ZIP）
  - PDF → 文本（TXT）
  - 图片 → PDF
- `Merge`：多 PDF 合并（可下载）
- `Compress`：基于渲染重建的压缩（会栅格化页面，体积更小但文本不可选）

说明：上述 PDF 处理优先在浏览器本地完成（不需要上传到服务器），更利于隐私与部署简单性。

## 环境变量（可选）

- NextAuth
  - `NEXTAUTH_SECRET`
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`（可选，配置后才会显示 Google 登录）
  - `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`（可选，配置后才会显示 Facebook 登录）
- Stripe（订阅/支付相关）
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_ANNUAL_PRICE_ID`

## 计划中的功能（Coming soon）

- 页面组织（排序/旋转/删除/拆分）
- 水印、密码保护/解锁、打码/涂黑
- Office 文档转换（需要后端转换服务/容器能力）
