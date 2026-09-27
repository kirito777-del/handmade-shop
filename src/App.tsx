import { useCallback, useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react'
import { supabase, type Category, type Product } from './lib/supabase'
import './App.css'

type Session = { user: { email: string } } | null

function App() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session>(null)
  const [ownerMode, setOwnerMode] = useState(false)

  const fetchData = useCallback(async () => {
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('*').order('sort_order', { ascending: true }),
    ])
    if (catRes.data) setCategories(catRes.data)
    if (prodRes.data) setProducts(prodRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session as Session)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess as Session)
    })

    const channels = supabase
      .channel('realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
      .subscribe()

    return () => {
      authListener.subscription.unsubscribe()
      supabase.removeChannel(channels)
    }
  }, [fetchData])

  const visibleProducts = useMemo(() => {
    let list = products.filter((p) => p.is_active || ownerMode)
    if (activeCategory !== 'all') list = list.filter((p) => p.category_id === activeCategory)
    return list
  }, [products, activeCategory, ownerMode])

  const currentCategoryName = useMemo(() => {
    if (activeCategory === 'all') return '全部'
    return categories.find((c) => c.id === activeCategory)?.name ?? ''
  }, [activeCategory, categories])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>加载中…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="shop-title">手作小铺</h1>
        <p className="shop-subtitle">用心手作 · 独一无二</p>
      </header>

      <nav className="category-bar">
        <button
          className={`cat-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          全部
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`cat-btn ${activeCategory === c.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(c.id)}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <main className="main">
        <h2 className="section-title">{currentCategoryName}</h2>
        {visibleProducts.length === 0 ? (
          <div className="empty-state">该分类下暂无商品</div>
        ) : (
          <div className="product-grid">
            {visibleProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>

      <OwnerButton session={session} ownerMode={ownerMode} setOwnerMode={setOwnerMode} />

      {ownerMode && (
        <AdminPanel
          categories={categories}
          products={products}
          onClose={() => setOwnerMode(false)}
        />
      )}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className={`product-card ${!product.is_active ? 'inactive' : ''}`}>
      <div className="product-img-wrap">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-img-placeholder">暂无图片</div>
        )}
        {!product.is_active && <span className="soldout-badge">已下架</span>}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        {product.description && <p className="product-desc">{product.description}</p>}
        <div className="product-price">
          {product.price === null || product.price === undefined ? (
            <span className="price-tbd">价格面议</span>
          ) : (
            <span>¥{product.price.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</span>
          )}
        </div>
      </div>
    </article>
  )
}

function OwnerButton({
  session,
  ownerMode,
  setOwnerMode,
}: {
  session: Session
  ownerMode: boolean
  setOwnerMode: (v: boolean) => void
}) {
  const [showLogin, setShowLogin] = useState(false)

  const handleClick = async () => {
    if (session) {
      setOwnerMode(!ownerMode)
    } else {
      setShowLogin(true)
    }
  }

  return (
    <>
      <button className="owner-fab" onClick={handleClick} title="店主入口" aria-label="店主入口">
        {session ? '✓' : '·'}
      </button>
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false)
            setOwnerMode(true)
          }}
        />
      )}
    </>
  )
}

function LoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const ownerEmail = import.meta.env.VITE_OWNER_EMAIL as string

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: ownerEmail,
      password,
    })
    setSubmitting(false)
    if (error) {
      setError('密码错误，请重试')
    } else {
      onSuccess()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>店主登录</h3>
        <input
          type="password"
          placeholder="请输入店主密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={submitting || !password}>
            {submitting ? '登录中…' : '登录'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AdminPanel({
  categories,
  products,
  onClose,
}: {
  categories: Category[]
  products: Product[]
  onClose: () => void
}) {
  const [tab, setTab] = useState<'categories' | 'products'>('categories')

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h3>店主管理</h3>
        <button className="btn-ghost" onClick={onClose}>
          退出管理
        </button>
      </div>
      <div className="admin-tabs">
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>
          分类管理
        </button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          商品管理
        </button>
      </div>
      {tab === 'categories' ? (
        <CategoryManager categories={categories} products={products} />
      ) : (
        <ProductManager categories={categories} products={products} />
      )}
    </div>
  )
}

function CategoryManager({
  categories,
  products,
}: {
  categories: Category[]
  products: Product[]
}) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  const addCategory = async () => {
    const name = newName.trim()
    if (!name) return
    setError('')
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0)
    const { error } = await supabase
      .from('categories')
      .insert({ name, sort_order: maxOrder + 1 })
    if (error) setError(error.message)
    else setNewName('')
  }

  const removeCategory = async (id: number) => {
    const count = products.filter((p) => p.category_id === id).length
    if (count > 0) {
      if (!confirm(`该分类下有 ${count} 件商品，删除分类会同时删除这些商品，确定继续？`)) return
    }
    setError('')
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) setError(error.message)
  }

  const renameCategory = async (id: number, name: string) => {
    const newName = prompt('输入新的分类名称', name)
    if (newName === null || !newName.trim()) return
    const { error } = await supabase.from('categories').update({ name: newName.trim() }).eq('id', id)
    if (error) setError(error.message)
  }

  return (
    <div className="admin-section">
      <div className="admin-add-row">
        <input
          placeholder="新分类名称"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn-primary" onClick={addCategory} disabled={!newName.trim()}>
          添加分类
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <ul className="admin-list">
        {categories.map((c) => (
          <li key={c.id} className="admin-list-item">
            <span>{c.name}</span>
            <div className="admin-list-actions">
              <button className="btn-ghost" onClick={() => renameCategory(c.id, c.name)}>
                重命名
              </button>
              <button className="btn-danger" onClick={() => removeCategory(c.id)}>
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProductManager({
  categories,
  products,
}: {
  categories: Category[]
  products: Product[]
}) {
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const toggleActive = async (p: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !p.is_active })
      .eq('id', p.id)
    if (error) setError(error.message)
  }

  const removeProduct = async (p: Product) => {
    if (!confirm(`确定删除商品「${p.name}」？`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) setError(error.message)
  }

  return (
    <div className="admin-section">
      <div className="admin-add-row">
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
        >
          + 新增商品
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <ul className="admin-list">
        {products.map((p) => {
          const catName = categories.find((c) => c.id === p.category_id)?.name ?? '未分类'
          return (
            <li key={p.id} className="admin-list-item">
              <div className="admin-product-thumb">
                {p.image_url ? <img src={p.image_url} alt="" /> : <span>图</span>}
              </div>
              <div className="admin-product-meta">
                <span className="admin-product-name">
                  {p.name}
                  {!p.is_active && <em className="inactive-tag">已下架</em>}
                </span>
                <span className="admin-product-sub">
                  {catName} · {p.price === null ? '面议' : `¥${p.price}`}
                </span>
              </div>
              <div className="admin-list-actions">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setEditing(p)
                    setShowForm(true)
                  }}
                >
                  编辑
                </button>
                <button className="btn-ghost" onClick={() => toggleActive(p)}>
                  {p.is_active ? '下架' : '上架'}
                </button>
                <button className="btn-danger" onClick={() => removeProduct(p)}>
                  删除
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {showForm && (
        <ProductForm
          categories={categories}
          product={editing}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function ProductForm({
  categories,
  product,
  onClose,
}: {
  categories: Category[]
  product: Product | null
  onClose: () => void
}) {
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product?.price?.toString() ?? '')
  const [categoryId, setCategoryId] = useState<number>(product?.category_id ?? categories[0]?.id ?? 0)
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '')
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true })
    if (upErr) {
      setError('图片上传失败：' + upErr.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    setImageUrl(data.publicUrl)
    setUploading(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请填写商品名称')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: price === '' ? null : parseFloat(price),
      category_id: categoryId,
      image_url: imageUrl || null,
      is_active: isActive,
    }
    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload)
    setSaving(false)
    if (error) setError(error.message)
    else onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal modal-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>{product ? '编辑商品' : '新增商品'}</h3>

        <label className="field-label">商品名称 *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：手工编织手链" />

        <label className="field-label">商品描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="可选的描述性信息"
          rows={3}
        />

        <label className="field-label">价格（元）</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="留空表示价格面议"
        />

        <label className="field-label">所属分类</label>
        <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="field-label">商品图片</label>
        <div className="image-upload-row">
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
          {uploading && <span className="uploading-hint">上传中…</span>}
        </div>
        {imageUrl ? (
          <img className="image-preview" src={imageUrl} alt="预览" />
        ) : (
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="或粘贴图片链接 URL"
          />
        )}

        <label className="checkbox-row">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          上架（顾客可见）
        </label>

        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={saving || uploading}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default App
