"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,98%)]">
      <div className="flex items-start">
        <Sidebar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-5 md:px-8 md:pb-10 md:pt-8 lg:px-10">
          {loading ? <DashboardLoadingSkeleton /> : user ? <ErrorBoundary>{children}</ErrorBoundary> : null}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-gray-200" />
      <div className="h-4 w-80 rounded-lg bg-gray-100" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 rounded-lg bg-white ring-1 ring-gray-100" />
        ))}
      </div>
    </div>
  );
}
