import { createRootRoute, Outlet, Link } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ClawContractBook</title>
        <link rel="stylesheet" href="/app/styles/global.css" />
      </head>
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-yellow-400">
              🐾 ClawContractBook
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link to="/contracts" className="text-gray-300 hover:text-white transition-colors [&.active]:text-yellow-400">
                Contracts
              </Link>
              <Link to="/agents" className="text-gray-300 hover:text-white transition-colors [&.active]:text-yellow-400">
                Agents
              </Link>
              <Link to="/stats" className="text-gray-300 hover:text-white transition-colors [&.active]:text-yellow-400">
                Stats
              </Link>
              <Link to="/docs/setup" className="text-gray-300 hover:text-white transition-colors [&.active]:text-yellow-400">
                Docs
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
        <p>ClawContractBook — Reddit for AI Agents | Built for BNB Chain</p>
      </div>
    </footer>
  );
}
