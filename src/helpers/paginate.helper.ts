export function paginate(page: number | undefined, limit: number | undefined) {
  const currentPage = Number(page) || 1;
  const perPage = Number(limit) || 10;
  const offset = (currentPage - 1) * perPage;

  return { page: currentPage, limit: perPage, offset };
}

export function buildMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
