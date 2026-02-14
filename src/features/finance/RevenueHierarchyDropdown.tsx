import React, { useState, useMemo } from 'react';
import type { HierarchyTreeNode } from '../../lib/paths';
import { getHierarchyTreeLeafPaths } from '../../lib/paths';

export interface RevenueHierarchyDropdownProps {
  tree: HierarchyTreeNode[];
  selectedPaths: string[];
  onTogglePath: (path: string) => void;
  onClose: () => void;
  onSelectAllUnder?: (paths: string[], add: boolean) => void;
}

export function RevenueHierarchyDropdown(props: RevenueHierarchyDropdownProps) {
  const { tree, selectedPaths, onTogglePath, onSelectAllUnder } = props;
  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderNode = (node: HierarchyTreeNode, depth: number, expandKey: string) => {
    const pl = 4 + depth * 12;
    if (node.fullPath) {
      const checked = selectedSet.has(node.fullPath);
      return (
        <label
          key={node.fullPath}
          className="flex cursor-pointer items-center gap-2 py-2 hover:bg-gray-50"
          style={{ paddingLeft: pl }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onTogglePath(node.fullPath!)}
            className="rounded border-gray-300 text-indigo-600"
          />
          <span className="text-sm text-gray-800">{node.segment}</span>
        </label>
      );
    }
    const isExpanded = expanded.has(expandKey);
    return (
      <div key={expandKey}>
        <button
          type="button"
          onClick={() => toggleExpand(expandKey)}
          className="flex w-full items-center gap-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          style={{ paddingLeft: pl }}
        >
          <i
            className={`fa-solid fa-chevron-right text-[10px] text-gray-400 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
          {node.segment}
        </button>
        {isExpanded && (
          <div className="border-l border-gray-100">
            {node.children.map((child) =>
              renderNode(
                child,
                depth + 1,
                child.fullPath ?? `${expandKey} > ${child.segment}`
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="absolute left-0 top-full z-50 mt-1 min-w-[280px] max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {tree.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-500">No categories</div>
      ) : (
        tree.map((root) => (
          <div key={root.segment} className="py-0.5">
            {root.children.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleExpand(root.segment)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-bold uppercase text-gray-700 hover:bg-gray-50"
                >
                  <i
                    className={`fa-solid fa-chevron-right text-[10px] text-gray-400 transition-transform ${
                      expanded.has(root.segment) ? 'rotate-90' : ''
                    }`}
                  />
                  {root.segment}
                </button>
                {expanded.has(root.segment) && (
                  <div className="border-l border-gray-100 pl-2">
                    {onSelectAllUnder && (() => {
                      const leafPaths = getHierarchyTreeLeafPaths([root]);
                      if (leafPaths.length === 0) return null;
                      const allSelected = leafPaths.every((p) => selectedSet.has(p));
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAllUnder(leafPaths, !allSelected);
                          }}
                          className="text-xs text-indigo-600 hover:underline px-4 py-1.5 text-left w-full"
                        >
                          {allSelected ? 'Deselect all' : 'Select all'}
                        </button>
                      );
                    })()}
                    {root.children.map((child) =>
                      renderNode(
                        child,
                        0,
                        child.fullPath ?? `${root.segment} > ${child.segment}`
                      )
                    )}
                  </div>
                )}
              </>
            ) : (
              root.fullPath && (
                <label className="flex cursor-pointer items-center gap-2 px-4 py-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(root.fullPath)}
                    onChange={() => onTogglePath(root.fullPath!)}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-sm text-gray-800">{root.segment}</span>
                </label>
              )
            )}
          </div>
        ))
      )}
    </div>
  );
}
