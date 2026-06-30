"use client";

import { useEffect, useState } from "react";
import type { DashboardSnapshot } from "@/types/crm";

export function useCrmOverview() {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/crm/overview", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No se pudo cargar el CRM");
        return body as DashboardSnapshot;
      })
      .then((snapshot) => {
        if (active) setData(snapshot);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Error desconocido");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, error, loading };
}
