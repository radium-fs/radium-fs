import { MDXProvider } from '@mdx-js/react';
import type { ReactNode, ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router';
import { CodeBlock } from './CodeBlock';

function Pre({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const child = children as React.ReactElement<{ children?: string; className?: string }> | undefined;
  if (child?.props?.children && typeof child.props.children === 'string') {
    return <CodeBlock className={child.props.className}>{child.props.children}</CodeBlock>;
  }
  return <pre {...props}>{children}</pre>;
}

function MdxAnchor({ href = '', children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const isRoute = href.startsWith('/') || href.startsWith('./') || href.startsWith('../');
  const isProtocolRelative = href.startsWith('//');

  if (isRoute && !isProtocolRelative) {
    return (
      <Link to={href} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}

const components = {
  a: MdxAnchor,
  pre: Pre,
};

export function MdxProvider({ children }: { children: ReactNode }) {
  return <MDXProvider components={components}>{children}</MDXProvider>;
}
