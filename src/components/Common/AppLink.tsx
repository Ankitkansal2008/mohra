import React from 'react';
import { Link, useInRouterContext } from 'react-router-dom';

export interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly to: string;
  readonly children: React.ReactNode;
}

// Renders React Router <Link> when inside router context, or standard <a> in static/SSR environments
export function AppLink({ to, children, className, ...props }: AppLinkProps): React.JSX.Element {
  const inRouter = useInRouterContext();

  if (inRouter) {
    return (
      <Link to={to} className={className} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  );
}

export default AppLink;

