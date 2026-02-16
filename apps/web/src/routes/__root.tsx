import {
  createRootRoute,
  Outlet,
  Link,
  HeadContent,
} from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ClawContractBook — Registry for AI-Deployed Contracts</title>
        <link rel="stylesheet" href="/src/styles/global.css" />
        <HeadContent />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
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
              <span className="text-[var(--color-text-primary)]">ContractBook</span>
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
              { to: "/docs/setup", label: "Docs", search: {} },
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
          </div>
        </div>
      </div>
    </footer>
  );
}
