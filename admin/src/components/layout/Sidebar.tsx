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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

const countries = [
  { code: 'tr', name: 'Turkey', flag: '🇹🇷' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'us', name: 'USA', flag: '🇺🇸' },
];

export function Sidebar() {
  const { signOut } = useAuthStore();
  const location = useLocation();
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [articlesOpen, setArticlesOpen] = useState(false);

  const isSourcesActive = location.pathname.startsWith('/sources');
  const isArticlesActive = location.pathname.startsWith('/articles');

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">D4ily Admin</h1>
        <p className="text-sm text-gray-400 mt-1">News Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>

        {/* Sources - Expandable */}
        <div>
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className={cn(
              'flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors',
              isSourcesActive
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <Rss className="h-5 w-5" />
              <span>Sources</span>
            </div>
            {sourcesOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {sourcesOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {countries.map((country) => (
                <NavLink
                  key={country.code}
                  to={`/sources/${country.code}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )
                  }
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </NavLink>
              ))}
              <NavLink
                to="/sources/manage-countries"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                <Plus className="h-4 w-4" />
                <span>Manage Countries</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Articles - Expandable */}
        <div>
          <button
            onClick={() => setArticlesOpen(!articlesOpen)}
            className={cn(
              'flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors',
              isArticlesActive
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <Newspaper className="h-5 w-5" />
              <span>Articles</span>
            </div>
            {articlesOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {articlesOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {countries.map((country) => (
                <NavLink
                  key={country.code}
                  to={`/articles/${country.code}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )
                  }
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Users */}
        <NavLink
          to="/users"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )
          }
        >
          <Users className="h-5 w-5" />
          <span>Users</span>
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )
          }
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* Logout */}
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
