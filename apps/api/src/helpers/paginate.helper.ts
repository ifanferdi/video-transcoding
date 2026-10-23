export const paginate = (
  data: Record<string, any>,
  total: number,
  page: number = 1,
  limit: number = 10,
) => ({
  data,
  meta: {
    page,
    limit: limit === -1 ? total || 1 : limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  },
});
