"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import Link from "next/link";
import {
  Search,
  FileText,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  Tag,
} from "lucide-react";

interface SearchHit {
  id: number;
  title: string;
  description: string;
  category: string;
  tags: string[];
  file_type: string;
  file_size: number;
  important_date: string | null;
  date_label: string | null;
  created_at: string;
  updated_at: string;
  _score: number | null;
  highlights: Record<string, string[]>;
  summary?: string;
  headline?: string;
}

interface Bucket {
  key: string;
  count: number;
}

interface Aggregations {
  categories?: Bucket[];
  tags?: Bucket[];
  file_types?: Bucket[];
  date_labels?: Bucket[];
}

interface SearchResult {
  hits: SearchHit[];
  total: number;
  aggregations: Aggregations;
  fallback?: boolean;
}

const categoryColors: Record<string, string> = {
  license: "bg-purple-100 text-purple-700",
  bill: "bg-green-100 text-green-700",
  insurance: "bg-yellow-100 text-yellow-700",
  tax: "bg-red-100 text-red-700",
  contract: "bg-blue-100 text-blue-700",
  receipt: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [reindexing, setReindexing] = useState(false);

  // Filters
  const [category, setCategory] = useState<string | null>(
    searchParams.get("category")
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.getAll("tags")
  );
  const [fileType, setFileType] = useState<string | null>(
    searchParams.get("file_type")
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "relevance");
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );

  const performSearch = useCallback(
    async (resetPage = false) => {
      setLoading(true);
      const currentPage = resetPage ? 1 : page;
      if (resetPage) setPage(1);

      try {
        const params: Record<string, string | string[]> = {};
        if (query.trim()) params.q = query.trim();
        if (category) params.category = category;
        if (selectedTags.length) params.tags = selectedTags;
        if (fileType) params.file_type = fileType;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        params.sort = sortBy;
        params.page = String(currentPage);
        params.size = "20";

        const res = await api.get("/search", { params });
        setResults(res.data);

        // Update URL
        const urlParams = new URLSearchParams();
        if (query.trim()) urlParams.set("q", query.trim());
        if (category) urlParams.set("category", category);
        selectedTags.forEach((t) => urlParams.append("tags", t));
        if (fileType) urlParams.set("file_type", fileType);
        if (dateFrom) urlParams.set("date_from", dateFrom);
        if (dateTo) urlParams.set("date_to", dateTo);
        if (sortBy !== "relevance") urlParams.set("sort", sortBy);
        if (currentPage > 1) urlParams.set("page", String(currentPage));
        router.replace(`/search?${urlParams.toString()}`, { scroll: false });
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [query, category, selectedTags, fileType, dateFrom, dateTo, sortBy, page, router]
  );

  useEffect(() => {
    performSearch();
  }, [category, selectedTags, fileType, dateFrom, dateTo, sortBy, page]);

  // Initial search on mount if params present
  useEffect(() => {
    if (searchParams.get("q") || searchParams.get("category")) {
      performSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(true);
  };

  const clearFilters = () => {
    setCategory(null);
    setSelectedTags([]);
    setFileType(null);
    setDateFrom("");
    setDateTo("");
    setSortBy("relevance");
    setPage(1);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await api.post("/search/reindex");
      performSearch(true);
    } catch {
      // silently fail
    } finally {
      setReindexing(false);
    }
  };

  const totalPages = results ? Math.ceil(results.total / 20) : 0;
  const hasActiveFilters =
    category || selectedTags.length > 0 || fileType || dateFrom || dateTo;

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 p-6">
        {/* Search Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Search Documents</h1>
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title="Rebuild search index"
            >
              <RefreshCw size={14} className={reindexing ? "animate-spin" : ""} />
              {reindexing ? "Reindexing..." : "Reindex"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search inside documents, titles, tags..."
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                showFilters
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter size={16} />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>
          </form>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Category facet */}
                <FacetSection title="Category">
                  {(results?.aggregations?.categories || []).map((bucket) => (
                    <FacetItem
                      key={bucket.key}
                      label={bucket.key}
                      count={bucket.count}
                      active={category === bucket.key}
                      onClick={() =>
                        setCategory(
                          category === bucket.key ? null : bucket.key
                        )
                      }
                      colorClass={categoryColors[bucket.key]}
                    />
                  ))}
                </FacetSection>

                {/* File Type facet */}
                <FacetSection title="File Type">
                  {(results?.aggregations?.file_types || []).map((bucket) => (
                    <FacetItem
                      key={bucket.key}
                      label={bucket.key.toUpperCase()}
                      count={bucket.count}
                      active={fileType === bucket.key}
                      onClick={() =>
                        setFileType(
                          fileType === bucket.key ? null : bucket.key
                        )
                      }
                    />
                  ))}
                </FacetSection>

                {/* Tags facet */}
                <FacetSection title="Tags">
                  {(results?.aggregations?.tags || []).map((bucket) => (
                    <FacetItem
                      key={bucket.key}
                      label={bucket.key}
                      count={bucket.count}
                      active={selectedTags.includes(bucket.key)}
                      onClick={() => toggleTag(bucket.key)}
                    />
                  ))}
                </FacetSection>

                {/* Date Range */}
                <FacetSection title="Date Range">
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500">From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setPage(1);
                        }}
                        className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setPage(1);
                        }}
                        className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </FacetSection>

                {/* Sort */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Sort by
                  </h4>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date_desc">Newest first</option>
                    <option value="date_asc">Oldest first</option>
                    <option value="title">Title A-Z</option>
                    <option value="size">Largest first</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : results ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">
                    {results.total} result{results.total !== 1 ? "s" : ""} found
                    {results.fallback && (
                      <span className="ml-2 text-amber-600">
                        (basic search — OpenSearch unavailable)
                      </span>
                    )}
                  </p>
                </div>

                {results.hits.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <Search size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No documents found.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try different keywords or clear some filters.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.hits.map((hit) => (
                      <SearchResultCard key={hit.id} hit={hit} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Search size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  Enter a search query to find documents.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

function SearchResultCard({ hit }: { hit: SearchHit }) {
  return (
    <Link
      href={`/documents/${hit.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-50 rounded-lg mt-0.5">
          <FileText size={20} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">
              {hit.highlights?.title ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: hit.highlights.title[0],
                  }}
                />
              ) : (
                hit.title
              )}
            </h3>
            {hit._score && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                score: {hit._score.toFixed(2)}
              </span>
            )}
          </div>

          {/* Highlights from content */}
          {hit.highlights?.content && (
            <div className="mt-1 text-sm text-gray-600 space-y-1">
              {hit.highlights.content.map((frag, i) => (
                <p
                  key={i}
                  className="line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: `...${frag}...` }}
                />
              ))}
            </div>
          )}

          {/* Description highlights */}
          {!hit.highlights?.content && hit.highlights?.description && (
            <div className="mt-1 text-sm text-gray-600">
              <p
                className="line-clamp-2"
                dangerouslySetInnerHTML={{
                  __html: hit.highlights.description[0],
                }}
              />
            </div>
          )}

          {/* Fallback to summary */}
          {!hit.highlights?.content &&
            !hit.highlights?.description &&
            hit.summary && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {hit.summary}
              </p>
            )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                categoryColors[hit.category] || categoryColors.other
              }`}
            >
              {hit.category}
            </span>
            {hit.file_type && (
              <span className="text-xs text-gray-400 uppercase">
                {hit.file_type}
              </span>
            )}
            {hit.file_size > 0 && (
              <span className="text-xs text-gray-400">
                {formatFileSize(hit.file_size)}
              </span>
            )}
            {hit.important_date && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={10} />
                {hit.date_label}: {hit.important_date}
              </span>
            )}
            {hit.tags?.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600"
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

function FacetSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase mb-2"
      >
        {title}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && <div className="space-y-1">{children}</div>}
    </div>
  );
}

function FacetItem({
  label,
  count,
  active,
  onClick,
  colorClass,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  colorClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full px-2 py-1.5 rounded text-xs transition-colors ${
        active
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      <span className="flex items-center gap-1.5 capitalize">
        {colorClass && (
          <span className={`w-2 h-2 rounded-full ${colorClass.split(" ")[0]}`} />
        )}
        {label}
      </span>
      <span className="text-gray-400">{count}</span>
    </button>
  );
}
