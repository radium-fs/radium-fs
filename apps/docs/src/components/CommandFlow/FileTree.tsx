import { useState } from 'react';
import type { FileTreeNode } from '../../engine/types';

interface FileTreeProps {
  tree: FileTreeNode;
  basePath?: string;
  onFileClick: (path: string, content: string) => void;
}

interface TreeNodeProps {
  node: FileTreeNode;
  path: string;
  depth: number;
  onFileClick: (path: string, content: string) => void;
}

function TreeNode({ node, path, depth, onFileClick }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const fullPath = path ? `${path}/${node.name}` : node.name;
  const indent = depth * 16;

  if (node.type === 'dir') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center w-full text-left py-0.5 hover:bg-surface-raised transition-colors group"
          style={{ paddingLeft: indent }}
        >
          <span className="text-text-secondary text-xs mr-1.5 w-3 text-center">
            {expanded ? '▾' : '▸'}
          </span>
          <span className="text-xs font-mono text-text-secondary group-hover:text-text-primary transition-colors">
            {node.name}/
          </span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.name}
                node={child}
                path={fullPath}
                depth={depth + 1}
                onFileClick={onFileClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileClick(fullPath, node.content ?? '')}
      className="flex items-center w-full text-left py-0.5 hover:bg-surface-raised transition-colors group"
      style={{ paddingLeft: indent }}
    >
      <span className="text-text-secondary text-xs mr-1.5 w-3 text-center">
        ·
      </span>
      <span className="text-xs font-mono text-accent/80 group-hover:text-accent transition-colors">
        {node.name}
      </span>
    </button>
  );
}

export function FileTree({ tree, onFileClick }: FileTreeProps) {
  if (!tree.children || tree.children.length === 0) return null;

  return (
    <div className="py-1">
      {tree.children.map((child) => (
        <TreeNode
          key={child.name}
          node={child}
          path=""
          depth={0}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
