import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, LogOut, ShoppingBag, Upload, Film, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/cart-store";
import { uploadMedia, isVideoFile } from "@/lib/media-upload";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  video_url: string | null;
  stock: number;
  status: "active" | "sold_out" | "draft";
  category: string | null;
};

type MediaRow = {
  id: string;
  kind: string;
  url: string;
  poster_url: string | null;
  title: string | null;
  subtitle: string | null;
  sort_order: number;
  active: boolean;
};

type OrderRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
};


function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return setIsAdmin(false);
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data: role }) => setIsAdmin(!!role));
    });
  }, []);

  const { data: products } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRow[];
    },
    enabled: isAdmin === true,
  });

  const { data: orders } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_email, total_cents, currency, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as OrderRow[];
    },
    enabled: isAdmin === true,
  });

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", search: {} as never });
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  }

  async function quickStatus(id: string, status: ProductRow["status"]) {
    const { error } = await supabase.from("products").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  }

  if (isAdmin === null) {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-[var(--muted-foreground)]">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Not authorized</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          This account isn't the shop owner. The first user to sign up becomes the admin.
        </p>
        <button onClick={signOut} className="btn-primary mt-6">Sign out</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Kitchen admin</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Manage products, stock and orders.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCreating(true)} className="btn-primary text-sm">
            <Plus size={16} /> New product
          </button>
          <button onClick={signOut} className="btn-ghost text-sm">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {/* Products */}
      <section className="mt-10">
        <h2 className="font-display text-2xl mb-4">Products</h2>
        <div className="card-soft overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_100px_100px_130px_120px] gap-3 items-center px-4 py-3 border-b border-[var(--border)] text-xs uppercase tracking-widest text-[var(--muted-foreground)] hidden md:grid">
            <div>Image</div><div>Name</div><div>Price</div><div>Stock</div><div>Status</div><div className="text-right">Actions</div>
          </div>
          {products && products.length > 0 ? (
            products.map((p) => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-[80px_1fr_100px_100px_130px_120px] gap-3 items-center px-4 py-4 border-b border-[var(--border)] last:border-b-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--muted)]">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🧁</div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)] line-clamp-1">{p.description}</div>
                </div>
                <div className="font-semibold">{formatMoney(p.price_cents, p.currency)}</div>
                <div>{p.stock}</div>
                <div>
                  <select
                    value={p.status}
                    onChange={(e) => quickStatus(p.id, e.target.value as ProductRow["status"])}
                    className="input-field !py-1 !px-2 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="sold_out">Sold out</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditing(p)} className="btn-ghost !p-2" aria-label="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="btn-ghost !p-2 text-[var(--destructive)]" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-[var(--muted-foreground)]">
              No products yet. Click <b>New product</b> above.
            </div>
          )}
        </div>
      </section>

      {/* Media library */}
      <MediaManager />

      {/* Orders */}

      <section className="mt-12">
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
          <ShoppingBag size={20} /> Recent orders
        </h2>
        <div className="card-soft overflow-hidden">
          {orders && orders.length > 0 ? (
            orders.map((o) => (
              <div key={o.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_120px_140px] gap-3 items-center px-4 py-4 border-b border-[var(--border)] last:border-b-0 text-sm">
                <div className="font-semibold">{o.customer_name}</div>
                <div className="text-[var(--muted-foreground)] truncate">{o.customer_email}</div>
                <div>{formatMoney(o.total_cents, o.currency)}</div>
                <div><span className="chip bg-[var(--secondary)] text-[var(--secondary-foreground)]">{o.status}</span></div>
                <div className="text-[var(--muted-foreground)] text-xs">{new Date(o.created_at).toLocaleString()}</div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-[var(--muted-foreground)]">No orders yet.</div>
          )}
        </div>
      </section>

      {(editing || creating) && (
        <ProductDialog
          product={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => {
            setEditing(null); setCreating(false);
            qc.invalidateQueries({ queryKey: ["admin", "products"] });
          }}
        />
      )}
    </div>
  );
}

function ProductDialog({
  product,
  onClose,
  onSaved,
}: {
  product: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !product;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? (product.price_cents / 100).toFixed(2) : "",
    currency: product?.currency ?? "USD",
    image_url: product?.image_url ?? "",
    video_url: product?.video_url ?? "",
    stock: product?.stock ?? 0,
    status: product?.status ?? "active",
    category: product?.category ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);

  async function handleFile(field: "image_url" | "video_url", file?: File | null) {
    if (!file) return;
    setUploading(field === "image_url" ? "image" : "video");
    try {
      const url = await uploadMedia(file, "products");
      setForm((f) => ({ ...f, [field]: url }));
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cents: Math.round(parseFloat(form.price || "0") * 100),
      currency: form.currency.trim().toUpperCase() || "USD",
      image_url: form.image_url.trim() || null,
      video_url: form.video_url.trim() || null,
      stock: Number(form.stock),
      status: form.status,
      category: form.category.trim() || null,
    };

    const { error } = isNew
      ? await supabase.from("products").insert(payload)
      : await supabase.from("products").update(payload).eq("id", product!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Product created" : "Product updated");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="bg-[var(--background)] rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display text-2xl mb-4">{isNew ? "New product" : "Edit product"}</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field mt-1 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold">Price *</label>
              <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold">Currency</label>
              <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input-field mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">Image URL</label>
            <input
              type="url"
              placeholder="https://…"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="input-field mt-1"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Paste a link to your image (Imgur, Cloudinary, etc.)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold">Stock left</label>
              <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductRow["status"] })} className="input-field mt-1">
                <option value="active">Active</option>
                <option value="sold_out">Sold out</option>
                <option value="draft">Draft (hidden)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">Category</label>
            <input placeholder="Cookies, Cakes…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field mt-1" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button disabled={busy} className="btn-primary flex-1">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
