import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Newspaper,
  Rss,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Twitter,
  Clock,
  Bell,
  Activity,
  Shield,
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { COUNTRIES } from '../../types';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
    isActive
      ? 'bg-primary-600 text-white'
      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
  );

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
    isActive
      ? 'bg-primary-600 text-white'
      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
  );

function CollapsibleSection({
  label,
  icon: Icon,
  isActive,
  isOpen,
  toggle,
  children,
}: {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  isOpen: boolean;
  toggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors',
          isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isOpen && <div className="ml-4 mt-1 space-y-1">{children}</div>}
    </div>
  );
}

function CountryLinks({ basePath }: { basePath: string }) {
  return (
    <>
      {COUNTRIES.map((country) => (
        <NavLink key={country.code} to={`${basePath}/${country.code}`} className={subLinkClass}>
          <span>{country.flag}</span>
          <span>{country.name}</span>
        </NavLink>
      ))}
    </>
  );
}

export function Sidebar() {
  const { signOut } = useAuthStore();
  const location = useLocation();
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [articlesOpen, setArticlesOpen] = useState(false);
  const [digestsOpen, setDigestsOpen] = useState(false);
  const [twitterOpen, setTwitterOpen] = useState(false);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">D4ily Admin</h1>
        <p className="text-sm text-gray-400 mt-1">News Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavLink to="/" end className={navLinkClass}>
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>

        <CollapsibleSection
          label="Sources"
          icon={Rss}
          isActive={location.pathname.startsWith('/sources')}
          isOpen={sourcesOpen}
          toggle={() => setSourcesOpen(!sourcesOpen)}
        >
          <CountryLinks basePath="/sources" />
          <NavLink to="/sources/manage-countries" className={subLinkClass}>
            <Plus className="h-4 w-4" />
            <span>Manage Countries</span>
          </NavLink>
        </CollapsibleSection>

        <CollapsibleSection
          label="Articles"
          icon={Newspaper}
          isActive={location.pathname.startsWith('/articles')}
          isOpen={articlesOpen}
          toggle={() => setArticlesOpen(!articlesOpen)}
        >
          <CountryLinks basePath="/articles" />
        </CollapsibleSection>

        <CollapsibleSection
          label="Digests"
          icon={FileText}
          isActive={location.pathname.startsWith('/digests')}
          isOpen={digestsOpen}
          toggle={() => setDigestsOpen(!digestsOpen)}
        >
          <CountryLinks basePath="/digests" />
        </CollapsibleSection>

        <CollapsibleSection
          label="Twitter/X"
          icon={Twitter}
          isActive={location.pathname.startsWith('/twitter')}
          isOpen={twitterOpen}
          toggle={() => setTwitterOpen(!twitterOpen)}
        >
          <CountryLinks basePath="/twitter" />
        </CollapsibleSection>

        <NavLink to="/users" className={navLinkClass}>
          <Users className="h-5 w-5" />
          <span>Users</span>
        </NavLink>

        <NavLink to="/moderation" className={navLinkClass}>
          <Shield className="h-5 w-5" />
          <span>Moderation</span>
        </NavLink>

        <NavLink to="/campaigns" className={navLinkClass}>
          <Megaphone className="h-5 w-5" />
          <span>Campaigns</span>
        </NavLink>

        <NavLink to="/notifications" className={navLinkClass}>
          <Bell className="h-5 w-5" />
          <span>Notifications</span>
        </NavLink>

        <NavLink to="/cron-logs" className={navLinkClass}>
          <Clock className="h-5 w-5" />
          <span>Cron Logs</span>
        </NavLink>

        <NavLink to="/system" className={navLinkClass}>
          <Activity className="h-5 w-5" />
          <span>System Health</span>
        </NavLink>

        <NavLink to="/settings" className={navLinkClass}>
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
