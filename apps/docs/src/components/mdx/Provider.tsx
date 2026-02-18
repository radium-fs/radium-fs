import { MDXProvider } from '@mdx-js/react';
import type { ReactNode, ComponentPropsWithoutRef } from 'react';
import { CodeBlock } from './CodeBlock';

function Pre({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const child = children as React.ReactElement<{ children?: string; className?: string }> | undefined;
  if (child?.props?.children && typeof child.props.children === 'string') {
    return <CodeBlock className={child.props.className}>{child.props.children}</CodeBlock>;
  }
  return <pre {...props}>{children}</pre>;
}

const components = {
  pre: Pre,
};

export function MdxProvider({ children }: { children: ReactNode }) {
  return <MDXProvider components={components}>{children}</MDXProvider>;
}
