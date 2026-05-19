'use client';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
  itemLabel?: string;
}

function getPageRange(current: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | 'gap')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);

  if (left > 2) pages.push('gap');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push('gap');
  pages.push(totalPages);

  return pages;
}

export default function Pagination({
  page,
  total,
  limit,
  onChange,
  itemLabel = 'data',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const range = getPageRange(page, totalPages);

  return (
    <div className="border-t border-stone-100 px-4 md:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
      <p className="text-xs sm:text-sm text-stone-500">
        Menampilkan <span className="font-medium text-stone-700">{from}</span>
        –<span className="font-medium text-stone-700">{to}</span> dari{' '}
        <span className="font-medium text-stone-700">{total}</span> {itemLabel}
      </p>

      <nav aria-label="Pagination" className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Halaman sebelumnya"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        {range.map((p, i) =>
          p === 'gap' ? (
            <span
              key={`gap-${i}`}
              className="inline-flex items-center justify-center w-9 h-9 text-stone-400"
              aria-hidden
            >
              <MoreHorizontal size={14} />
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`inline-flex items-center justify-center min-w-9 h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Halaman selanjutnya"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
