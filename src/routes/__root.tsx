import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ShoppingBag } from "lucide-react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useCart } from "@/lib/cart-store";
import { useAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/kookie-queen-logo.png";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-[var(--primary)]">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          This treat seems to have been eaten already.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Back to shop
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Try refreshing the page.
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn-primary mt-6"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kookie Queen — Handmade small-batch cookies" },
      {
        name: "description",
        content:
          "Kookie Queen bakes handmade small-batch cookies with real butter. Fresh from our kitchen, delivered to your door.",
      },
      { property: "og:title", content: "Kookie Queen — Handmade small-batch cookies" },
      {
        property: "og:description",
        content: "Fresh, handmade cookies baked to order. Shop online at Kookie Queen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Runs before any app bundle: iOS Safari (Private Browsing / blocked cookies)
// throws on *any* window.localStorage access, which crashed the whole app.
const STORAGE_SHIM = `(function(){function m(){var d={};return{get length(){return Object.keys(d).length},clear:function(){d={}},getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},key:function(i){return Object.keys(d)[i]||null},removeItem:function(k){delete d[k]},setItem:function(k,v){d[k]=String(v)}}}
["localStorage","sessionStorage"].forEach(function(k){try{var s=window[k];s.setItem("__kq__","1");s.removeItem("__kq__")}catch(e){try{Object.defineProperty(window,k,{configurable:true,value:m()})}catch(e2){}}})})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: STORAGE_SHIM }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const { isAdmin } = useAdmin();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--background)]/85 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src={logo}
            alt="Kookie Queen logo"
            width={48}
            height={48}
            className="w-11 h-11 rounded-full ring-1 ring-[var(--gold)] object-cover"
          />
          <span className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            Kookie <span className="text-[var(--accent)]">Queen</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/" className="btn-ghost text-sm">
            Shop
          </Link>
          {isAdmin && (
            <Link to="/admin" className="btn-ghost text-sm hidden sm:inline-flex">
              Admin
            </Link>
          )}
          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 btn-dark text-sm"
            aria-label="Cart"
          >
            <ShoppingBag size={16} />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="ml-1 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-xs font-bold inline-flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}


function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--border)] bg-[var(--ink)] text-[var(--cream)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-8 sm:grid-cols-3">
        <div>
          <div className="font-display text-2xl">
            Kookie <span className="text-[var(--accent)]">Queen</span>
          </div>
          <p className="mt-2 text-sm text-[var(--cream)]/70 max-w-xs">
            Handmade small-batch cookies — crafted with love, delivered fresh.
          </p>
          <div className="mt-4 text-xs text-[var(--cream)]/60 leading-relaxed">
            <div className="uppercase tracking-widest mb-1">Payments</div>
            GTBank · 1034579657
            <br />
            Fatima Adam Yusuf
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-3">Shop</div>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/" className="hover:text-[var(--accent)]">All treats</Link>
            <Link to="/cart" className="hover:text-[var(--accent)]">Your cart</Link>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-3">Kitchen</div>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/track" search={{ code: undefined, email: undefined }} className="hover:text-[var(--accent)]">Track your order</Link>
            <a href="/#reviews" className="hover:text-[var(--accent)]">Customer reviews</a>
            <a href="/#story" className="hover:text-[var(--accent)]">Our story</a>
            <Link to="/auth" className="text-[var(--cream)]/40 hover:text-[var(--accent)]">
              Owner login
            </Link>
          </div>
        </div>

      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-[var(--cream)]/50">
        © {new Date().getFullYear()} Kookie Queen. All rights reserved.
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
