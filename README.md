# 手作小铺 — 商品展示网站

一个响应式的手工作品展示网站，支持分类切换、商品展示、以及店主密码登录后的后台管理。

## 技术栈

- **React 19 + TypeScript + Vite** — 企业主流前端技术栈
- **Supabase** — 后端即服务（数据库 + 认证 + 图片存储 + 实时同步）
- **Vercel** — 云部署，生成 PC/移动端均可访问的链接

## 部署步骤（一次性配置，约 10 分钟）

### 1. 创建 Supabase 后端

1. 打开 https://supabase.com ，用邮箱注册并登录（免费）。
2. 点击 **New project**，填写项目名（如 `handmade-shop`），设置数据库密码，选择离你最近的区域（如 `Southeast Asia (Singapore)`），点 **Create project**，等待初始化完成（约 1-2 分钟）。
3. 在左侧菜单打开 **SQL Editor**，点击 **New query**，把 `supabase/schema.sql` 文件的内容**全部粘贴**进去，点击 **Run** 执行。这会自动创建 `categories` 分类表、`products` 商品表、图片存储桶和访问权限策略。
4. 创建店主账号：左侧菜单 **Authentication → Users → Add user**，填写：
   - Email：你想用的店主邮箱（记下来，后面要用）
   - Password：店主登录密码（记下来）
   - 勾选 **Auto Confirm User**，点 **Create user**。
5. 获取 API 密钥：左侧 **Project Settings → API**，记下：
   - **Project URL**（形如 `https://xxxx.supabase.co`）
   - **anon public** key（长字符串）

### 2. 配置并部署到 Vercel

1. 打开 https://vercel.com ，用 GitHub 账号登录（免费）。
2. 点击 **Add New → Project**，导入本项目代码（可先推送到 GitHub，或直接拖拽上传）。
3. 在 **Environment Variables** 中填入以下四项（值来自上面 Supabase 的配置）：

   | 变量名 | 值 |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase 的 Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase 的 anon public key |
   | `VITE_OWNER_EMAIL` | 店主邮箱 |

4. 点击 **Deploy**。部署完成后，Vercel 会生成一个链接（如 `https://handmade-shop.vercel.app`），PC 和手机浏览器都能直接打开。

> 本地开发时，把上面三项填入项目根目录的 `.env` 文件（复制 `.env.example` 改名即可），然后运行 `npm install && npm run dev`。

## 使用说明

### 顾客端
- 打开链接即可看到商品，点击顶部按钮切换分类。
- 每个商品卡片展示图片、描述（可选）、价格（可留空显示"价格面议"）。

### 店主端
- 页面**右下角有一个不起眼的半透明圆点按钮**，点击后输入店主密码即可进入管理模式。
- 管理模式下可以：
  - 分类管理：添加、重命名、删除分类。
  - 商品管理：新增商品（上传图片、填描述、设价格、选分类）、编辑商品、上架/下架、删除。
- 所有改动会通过 Supabase 实时同步到所有访客的页面。

## 本地开发

```bash
npm install
npm run dev
```
