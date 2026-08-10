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
        <h2 className="font-display text-2xl mb-2 flex items-center gap-2">
          <ShoppingBag size={20} /> Recent orders
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Check your GTBank account, then mark payment as received — the customer sees the confirmation on their tracking page.
        </p>
        <div className="card-soft overflow-hidden">
          {orders && orders.length > 0 ? (
            orders.map((o) => (
              <div key={o.id} className="px-4 py-4 border-b border-[var(--border)] last:border-b-0 text-sm grid gap-3 sm:grid-cols-[1fr_auto] items-center">
                <div>
                  <div className="font-semibold">
                    {o.customer_name}{" "}
                    <span className="font-mono text-xs text-[var(--muted-foreground)]">#{o.tracking_code}</span>
                  </div>
                  <div className="text-[var(--muted-foreground)] truncate">{o.customer_email}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">
                    {formatMoney(o.total_cents, o.currency)} · {new Date(o.created_at).toLocaleString()}
                    {o.payment_confirmed_at
                      ? ` · payment confirmed ${new Date(o.payment_confirmed_at).toLocaleDateString()}`
                      : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                  <span className="chip bg-[var(--secondary)] text-[var(--secondary-foreground)]">{o.status}</span>
                  {o.status === "pending" && (
                    <button onClick={() => setOrderStatus(o.id, "paid")} className="btn-primary text-xs !py-1.5 !px-3">
                      <Check size={14} /> Confirm payment
                    </button>
                  )}
                  {o.status === "paid" && (
                    <button onClick={() => setOrderStatus(o.id, "fulfilled")} className="btn-ghost text-xs !py-1.5 !px-3">
                      Mark delivered
                    </button>
                  )}
                  {o.status !== "cancelled" && o.status !== "fulfilled" && (
                    <button onClick={() => setOrderStatus(o.id, "cancelled")} className="btn-ghost text-xs !py-1.5 !px-3 text-[var(--destructive)]">
                      Cancel
                    </button>
                  )}
                  {(o.status === "paid" || o.status === "cancelled") && (
                    <button onClick={() => setOrderStatus(o.id, "pending")} className="btn-ghost text-xs !py-1.5 !px-3">
                      Undo
                    </button>
                  )}
                </div>
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
            <label className="text-sm font-semibold">Photo</label>
            <div className="mt-1 flex items-center gap-3">
              {form.image_url && (
                <img src={form.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
              )}
              <label className="btn-ghost text-sm cursor-pointer border border-[var(--border)]">
                <Upload size={14} /> {uploading === "image" ? "Uploading…" : "Upload photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile("image_url", e.target.files?.[0])}
                />
              </label>
              {form.image_url && (
                <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="btn-ghost text-sm">
                  Remove
                </button>
              )}
            </div>
            <input
              type="url"
              placeholder="…or paste an image link"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="input-field mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Video (optional)</label>
            <div className="mt-1 flex items-center gap-3">
              <label className="btn-ghost text-sm cursor-pointer border border-[var(--border)]">
                <Film size={14} /> {uploading === "video" ? "Uploading…" : "Upload video"}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFile("video_url", e.target.files?.[0])}
                />
              </label>
              {form.video_url && (
                <button type="button" onClick={() => setForm({ ...form, video_url: "" })} className="btn-ghost text-sm">
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Shown on the product page — the photo swaps to the video automatically.
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
            <input placeholder="Chocolate chip, Shortbread…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field mt-1" />
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

function MediaManager() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: media } = useQuery({
    queryKey: ["admin", "site_media"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_media")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as MediaRow[];
    },
  });

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadMedia(file, "site");
        const { error } = await supabase.from("site_media").insert({
          kind: isVideoFile(file) ? "video" : "image",
          url,
          title: file.name.replace(/\.[^.]+$/, ""),
          sort_order: (media?.length ?? 0) + 1,
        });
        if (error) throw error;
      }
      toast.success("Media added");
      qc.invalidateQueries({ queryKey: ["admin", "site_media"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function patch(id: string, values: Partial<MediaRow>) {
    const { error } = await supabase.from("site_media").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "site_media"] });
  }

  async function remove(id: string) {
    if (!confirm("Remove this media from the site?")) return;
    const { error } = await supabase.from("site_media").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["admin", "site_media"] });
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-2xl flex items-center gap-2">
            <ImageIcon size={20} /> Homepage media
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Upload photos and videos — they rotate in the header banner and fill the gallery.
          </p>
        </div>
        <label className="btn-primary text-sm cursor-pointer">
          <Upload size={16} /> {uploading ? "Uploading…" : "Upload photo / video"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
      </div>

      {media && media.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {media.map((m) => (
            <div key={m.id} className="card-soft overflow-hidden">
              <div className="aspect-square bg-[var(--muted)]">
                {m.kind === "video" ? (
                  <video src={m.url} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                ) : (
                  <img src={m.url} alt={m.title ?? ""} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3 flex flex-col gap-2">
                <input
                  defaultValue={m.title ?? ""}
                  placeholder="Title"
                  onBlur={(e) => patch(m.id, { title: e.target.value || null })}
                  className="input-field !py-1.5 !px-2 text-sm"
                />
                <input
                  defaultValue={m.subtitle ?? ""}
                  placeholder="Caption"
                  onBlur={(e) => patch(m.id, { subtitle: e.target.value || null })}
                  className="input-field !py-1.5 !px-2 text-sm"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={m.active}
                      onChange={(e) => patch(m.id, { active: e.target.checked })}
                    />
                    Visible
                  </label>
                  <input
                    type="number"
                    defaultValue={m.sort_order}
                    onBlur={(e) => patch(m.id, { sort_order: Number(e.target.value) })}
                    className="input-field !py-1 !px-2 text-xs w-16"
                    aria-label="Order"
                  />
                  <button
                    onClick={() => remove(m.id)}
                    className="btn-ghost !p-1.5 text-[var(--destructive)]"
                    aria-label="Delete media"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-soft p-10 text-center text-[var(--muted-foreground)]">
          No media yet — upload your macaron video or a photo to bring the header to life.
        </div>
      )}
    </section>
  );
}
