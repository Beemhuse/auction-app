import { NavLink, Outlet } from 'react-router';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Gavel, LayoutDashboard, LockKeyhole, RefreshCw } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { useLogout } from '@/features/auth';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/auctions', label: 'Auctions', icon: Gavel },
];

export function AppLayout() {
  const queryClient = useQueryClient();
  const fetching = useIsFetching() > 0;
  const logout = useLogout();

  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          <div>
            <p className="brand-kicker">AUCTION OPERATIONS</p>
            <h1>Project Hammer</h1>
          </div>
          <nav className="main-nav" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('nav-link', isActive && 'active')}>
                <Icon size={16} aria-hidden="true" />{label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-actions">
          <span className="connection-state">{fetching ? 'Syncing...' : 'Connected'}</span>
          <IconButton
            icon={RefreshCw}
            label="Refresh data"
            className={cn(fetching && 'spinning')}
            onClick={() => queryClient.invalidateQueries()}
          />
          <Button variant="secondary" icon={LockKeyhole} onClick={logout} aria-label="Lock dashboard"><span className="hide-sm">Lock</span></Button>
        </div>
      </header>
      <main className="app-shell">
        <Outlet />
      </main>
    </>
  );
}
