import { preorderStatus, PREORDER_NOTE } from "@/lib/preorder";

export function PreorderBanner() {
  const { open, reopensLabel } = preorderStatus();
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        open
          ? "border-[var(--border)] bg-[var(--secondary)]"
          : "border-[var(--primary)]/40 bg-[var(--muted)]"
      }`}
    >
      <div className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
        {open ? "Pre-orders open" : "Pre-orders closed"}
      </div>
      <p className="mt-1 text-sm">
        {open
          ? `${PREORDER_NOTE} Get your order in before Wednesday night to be baked for this Sunday's delivery.`
          : `${PREORDER_NOTE} The order form reopens ${reopensLabel} — you can still browse the cookie menu.`}
      </p>
    </div>
  );
}
