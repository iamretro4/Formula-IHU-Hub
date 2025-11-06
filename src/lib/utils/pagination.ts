/**
 * Pagination utilities
 */

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  pageSize: number
) {
  const totalPages = Math.ceil(total / pageSize)
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

/**
 * Get offset for database queries
 */
export function getOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}

/**
 * Paginate an array
 */
export function paginateArray<T>(
  array: T[],
  page: number,
  pageSize: number
): PaginationResult<T> {
  const offset = getOffset(page, pageSize)
  const paginatedData = array.slice(offset, offset + pageSize)
  const pagination = calculatePagination(array.length, page, pageSize)

  return {
    data: paginatedData,
    pagination,
  }
}

