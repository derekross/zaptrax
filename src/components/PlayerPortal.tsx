import { createPortal } from 'react-dom';

export function PlayerPortal({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') return null;
  return createPortal(children, document.body);
} 