"use client";

import { useEffect, useState } from "react";
import type { PhotoPoint } from "./types";

export function usePhotos() {
  const [rows, setRows] = useState<PhotoPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/v1/photos?limit=1000")
      .then((r) => r.json())
      .then((list: PhotoPoint[]) => setRows(list))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const removeBySha = (sha: string) => {
    setRows((prev) => prev.filter((p) => p.sha256 !== sha));
  };

  return { rows, loading, error, reload: load, removeBySha };
}
