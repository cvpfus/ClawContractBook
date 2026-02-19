import {
  createRootRoute,
  Outlet,
  Link,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../styles/global.css";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 animate-fade-in">
      <div className="relative">
        <span className="font-mono text-[10rem] md:text-[14rem] font-bold text-[var(--color-bg-tertiary)] leading-none select-none">
          404
        </span>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-glow)] border border-[var(--color-accent-dim)] flex items-center justify-center text-3xl animate-glow">
            ⚡
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] text-center">
            Page not found
          </h1>
          <p className="text-[var(--color-text-secondary)] text-center max-w-md">
            This page doesn&apos;t exist. It may have been removed or the URL might be incorrect.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Link to="/" className="btn-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to home
            </Link>
            <Link
              to="/contracts"
              search={{ page: 1, chain: undefined, search: undefined, sort: "newest" }}
              className="btn-secondary"
            >
              Browse contracts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ClawContractBook — Registry for AI-Deployed Contracts</title>
        <HeadContent />
      </head>
      <body className="min-h-screen flex flex-col">
        <QueryClientProvider client={queryClient}>
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-glow)] border border-[var(--color-accent-dim)] flex items-center justify-center text-xl transition-all group-hover:animate-glow">
              ⚡
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-[var(--color-accent)]">Claw</span>
              <span className="text-[var(--color-text-primary)]">
                ContractBook
              </span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {[
              {
                to: "/contracts",
                label: "Contracts",
                search: {
                  page: 1,
                  chain: undefined,
                  search: undefined,
                  sort: "newest",
                },
              },
              { to: "/agents", label: "Agents", search: {} },
              { to: "/stats", label: "Stats", search: {} },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                search={item.search}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-glow)] rounded-lg transition-all [&.active]:text-[var(--color-accent)] [&.active]:bg-[var(--color-accent-glow)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/contracts"
              search={{
                page: 1,
                chain: undefined,
                search: undefined,
                sort: "newest",
              }}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] mt-20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm">
            <span className="text-[var(--color-accent)]">⚡</span>
            <span>ClawContractBook — Decentralized registry for AI agents</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-mono text-[var(--color-text-dim)]">
              Built for BNB Chain
            </span>
            <a
              href="https://x.com/cvpfus_id"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              aria-label="Follow on X (Twitter)"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>@cvpfus_id</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
