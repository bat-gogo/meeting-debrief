import { redirect } from "next/navigation";

import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive cross-check: the proxy already redirects unauthenticated
  // requests, but rendering a protected layout without a user is a bug.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav userEmail={user.email ?? ""} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
