import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Account created — you can sign in now.");
      setMode("signin");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Welcome back!");
      navigate({ to: "/admin", search: {} as never });
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Link to="/" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]">
        ← Back to shop
      </Link>
      <div className="card-soft p-8 mt-4">
        <h1 className="font-display text-3xl">
          {mode === "signin" ? "Owner sign in" : "Create your account"}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">
          {mode === "signup"
            ? "The first account to sign up becomes the admin."
            : "Manage products, stock and orders."}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold">Password</label>
            <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field mt-1" />
          </div>
          <button disabled={busy} className="btn-primary">
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="btn-ghost text-sm mt-4 w-full"
        >
          {mode === "signin" ? "Need to create an account?" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
