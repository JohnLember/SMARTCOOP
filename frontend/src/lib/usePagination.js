import { useState } from "react";

// Client-side pagination over an already-fetched array. Returns the current
// page's slice plus the state needed to render <Pagination />. The page is
// clamped into range during render, so a shrinking list (e.g. after filtering)
// never leaves you stranded on an empty page.
export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);
  const list = items ?? [];
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const start = (safePage - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);
  return { page: safePage, setPage, pageCount, pageItems };
}
