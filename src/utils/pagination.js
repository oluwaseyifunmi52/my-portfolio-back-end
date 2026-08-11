import { PAGINATION_DEFAULTS, SORT_ORDERS } from '../config/constants.js';

export function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || PAGINATION_DEFAULTS.PAGE);
  const limit = Math.min(
    PAGINATION_DEFAULTS.MAX_LIMIT,
    Math.max(1, parseInt(query.limit) || PAGINATION_DEFAULTS.LIMIT)
  );
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === SORT_ORDERS.ASC ? SORT_ORDERS.ASC : SORT_ORDERS.DESC;
  const search = query.search?.trim() || '';

  return { page, limit, sortBy, sortOrder, search };
}

export function buildPaginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function buildCursorPagination(cursor, limit, items, getCursor) {
  const hasNext = items.length > limit;
  const data = hasNext ? items.slice(0, limit) : items;
  const nextCursor = hasNext ? getCursor(data[data.length - 1]) : null;

  return {
    data,
    meta: {
      nextCursor,
      hasNext,
      limit,
    },
  };
}