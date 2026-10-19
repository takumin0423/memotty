import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/demo/messages">メモ一覧</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
