import type { NextRequest } from "next/server";

/**
 * Parse pagination params from a request URL.
 *
 * Usage:
 *   const { page, pageSize, skip, take } = parsePagination(request, { defaultSize: 25, maxSize: 100 });
 *   const [data, total] = await Promise.all([
 *     prisma.x.findMany({ skip, take, ... }),
 *     prisma.x.count({ where }),
 *   ]);
 *
 * Defaults: page=1, pageSize=25, maxPageSize=100.
 * Returns sane values even for garbage input (NaN -> 1, etc).
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(
  req: NextRequest,
  options: { defaultSize?: number; maxSize?: number } = {}
): PaginationParams {
  const { defaultSize = 25, maxSize = 100 } = options;
  const sp = req.nextUrl.searchParams;

  const rawPage = Number(sp.get("page") ?? 1);
  const rawSize = Number(sp.get("pageSize") ?? defaultSize);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0
      ? Math.min(Math.floor(rawSize), maxSize)
      : defaultSize;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Standard paginated response shape.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
