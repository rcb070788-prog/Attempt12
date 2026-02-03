/**
 * Parse hierarchy_path_canon into segments (e.g. "General Revenues > Taxes > Property" -> ["General Revenues", "Taxes", "Property"]).
 */
export function parseHierarchyPath(path: string): string[] {
  if (!path || typeof path !== 'string') return [];
  return path.split(' > ').map((s) => s.trim()).filter(Boolean);
}
