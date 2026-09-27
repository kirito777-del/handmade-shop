-- ============================================================
-- 手工店 数据库初始化脚本
-- 使用方法：登录 supabase.com -> 打开你的项目 -> SQL Editor -> 粘贴并运行本脚本
-- ============================================================

-- 分类表
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 商品表
create table if not exists public.products (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2),
  image_url text,
  is_active boolean not null default true,   -- true = 上架, false = 下架
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(is_active);

-- 商品图片存储桶（公共可读）
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ============================================================
-- 行级安全策略（RLS）
-- 顾客（匿名）只能看"上架中"的商品与所有分类
-- 已登录的店主可增删改分类与商品
-- ============================================================
alter table public.categories enable row level security;
alter table public.products enable row level security;

-- 分类：所有人可读
create policy "categories_public_read" on public.categories
  for select using (true);

-- 分类：仅已登录店主可写
create policy "categories_owner_write" on public.categories
  for insert with check (auth.role() = 'authenticated');
create policy "categories_owner_update" on public.categories
  for update using (auth.role() = 'authenticated');
create policy "categories_owner_delete" on public.categories
  for delete using (auth.role() = 'authenticated');

-- 商品：匿名只看上架商品；店主看全部
create policy "products_public_read_active" on public.products
  for select using (is_active = true or auth.role() = 'authenticated');

-- 商品：仅已登录店主可写
create policy "products_owner_insert" on public.products
  for insert with check (auth.role() = 'authenticated');
create policy "products_owner_update" on public.products
  for update using (auth.role() = 'authenticated');
create policy "products_owner_delete" on public.products
  for delete using (auth.role() = 'authenticated');

-- 存储桶策略：公共可读，仅店主可上传/删除
create policy "storage_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "storage_owner_upload" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "storage_owner_update" on storage.objects
  for update using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "storage_owner_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');
