/**
 * Parse hierarchy_path_canon into segments (e.g. "General Revenues > Taxes > Property" -> ["General Revenues", "Taxes", "Property"]).
 */
export function parseHierarchyPath(path: string): string[] {
  if (!path || typeof path !== 'string') return [];
  return path.split(' > ').map((s) => s.trim()).filter(Boolean);
}

export interface HierarchyTreeNode {
  segment: string;
  fullPath?: string;
  children: HierarchyTreeNode[];
}

/**
 * Build a tree from full hierarchy path strings. Root = first segment, leaves have fullPath set.
 */
export function buildHierarchyTree(paths: string[]): HierarchyTreeNode[] {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return [];
  const items = unique.map((p) => ({ path: p, fullPath: p }));
  return buildHierarchyTreeFromItems(items);
}

function buildHierarchyTreeFromItems(
  items: { path: string; fullPath: string }[]
): HierarchyTreeNode[] {
  if (items.length === 0) return [];
  const byFirst = new Map<string, { path: string; fullPath: string }[]>();
  for (const item of items) {
    const segs = parseHierarchyPath(item.path);
    const first = segs[0] ?? '';
    if (!first) continue;
    const list = byFirst.get(first) ?? [];
    list.push(item);
    byFirst.set(first, list);
  }
  const result: HierarchyTreeNode[] = [];
  for (const [segment, group] of byFirst.entries()) {
    const leaves = group.filter((item) => parseHierarchyPath(item.path).length === 1);
    const branches = group.filter((item) => parseHierarchyPath(item.path).length > 1);
    const childItems = branches.map((item) => {
      const segs = parseHierarchyPath(item.path);
      return { path: segs.slice(1).join(' > '), fullPath: item.fullPath };
    });
    const childNodes = childItems.length > 0 ? buildHierarchyTreeFromItems(childItems) : [];
    const leafNodes: HierarchyTreeNode[] = leaves.map((item) => ({
      segment: parseHierarchyPath(item.path)[0] ?? item.path,
      fullPath: item.fullPath,
      children: [],
    }));
    const allChildren = [...childNodes];
    for (const l of leafNodes) {
      if (!allChildren.some((c) => c.segment === l.segment && c.fullPath === l.fullPath)) {
        allChildren.push(l);
      }
    }
    allChildren.sort((a, b) => (a.segment ?? '').localeCompare(b.segment ?? ''));
    result.push({ segment, children: allChildren });
  }
  result.sort((a, b) => a.segment.localeCompare(b.segment));
  return result;
}

/**
 * Flatten tree to leaves with fullPath set (for multi-select).
 */
function collectLeafPaths(node: HierarchyTreeNode): string[] {
  if (node.fullPath) return [node.fullPath];
  return node.children.flatMap(collectLeafPaths);
}

export function getHierarchyTreeLeafPaths(nodes: HierarchyTreeNode[]): string[] {
  return nodes.flatMap(collectLeafPaths);
}

/**
 * If the tree has exactly one root whose segment matches rootSegmentToSkip, return its children.
 * Otherwise return the original tree. If stripping yields empty children, fall back to original.
 */
export function stripRedundantRoot(
  nodes: HierarchyTreeNode[],
  rootSegmentToSkip: string
): HierarchyTreeNode[] {
  if (nodes.length !== 1) return nodes;
  const root = nodes[0];
  if (root.segment !== rootSegmentToSkip) return nodes;
  const children = root.children;
  return children.length > 0 ? children : nodes;
}

/**
 * Flatten nodes with exactly one child that is a leaf (fullPath set).
 * When a parent has only one child and that child is a leaf, show the leaf at the parent level.
 * Does not flatten when the single child has children (keeps expandable structure).
 */
export function flattenSingleChildNodes(nodes: HierarchyTreeNode[]): HierarchyTreeNode[] {
  const result: HierarchyTreeNode[] = [];
  for (const node of nodes) {
    if (node.fullPath) {
      result.push(node);
      continue;
    }
    const flattened = flattenSingleChildNodes(node.children);
    if (flattened.length === 1 && flattened[0].fullPath) {
      result.push(flattened[0]);
    } else {
      result.push({ ...node, children: flattened });
    }
  }
  return result;
}
