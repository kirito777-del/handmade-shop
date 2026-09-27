import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少 Supabase 环境变量，请参考 README.md 配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Category = {
  id: number
  name: string
  sort_order: number
  created_at: string
}

export type Product = {
  id: number
  category_id: number
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '价格面议'
  return `¥${price.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
