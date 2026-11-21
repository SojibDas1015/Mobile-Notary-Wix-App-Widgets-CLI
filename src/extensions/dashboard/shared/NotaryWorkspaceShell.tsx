import React, { type ReactNode } from 'react';
import { NotaryTopNav } from './NotaryTopNav';
import './notary-brand.css';

interface NotaryWorkspaceShellProps {
  children: ReactNode;
}

/**
 * Shared branded header + tab navigation shell rendered inside PatternsReactRouter
 * so useLocation and usePatternsNavigate operate inside the active router context.
 */
export const NotaryWorkspaceShell = ({ children }: NotaryWorkspaceShellProps) => (
  <div className="dmn-shell">
    <NotaryTopNav />
    <div className="dmn-body">{children}</div>
  </div>
);
