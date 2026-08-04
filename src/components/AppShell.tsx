import { useState, type ReactNode } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { navItems } from '@/components/ui/Nav';

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { path, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeId = path.split('/')[1] || 'dashboard';

  const go = (id: string) => {
    navigate(`/${id}`);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-6">
        <img src="/image copy.png" alt="TrainX" className="h-11 w-11 rounded-xl object-cover shadow-lg" />
        <div>
          <h1 className="font-display text-xl font-bold text-white leading-none">TrainX</h1>
          <p className="text-[11px] text-ink-400 mt-0.5">AI Sports & Fitness</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-ink-300 hover:text-white hover:bg-ink-700/50 border border-transparent'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-ink-700/60">
        <button
          onClick={() => {
            if (profile?.id) navigate('/profile');
            setMobileOpen(false);
          }}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-ink-700/50 transition-colors mb-1"
        >
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-lime-500 flex items-center justify-center text-ink-950 font-bold text-sm">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white truncate max-w-[140px]">
              {profile?.full_name ?? 'Athlete'}
            </p>
            <p className="text-xs text-ink-400 capitalize">{profile?.sport?.replace('_', ' ')}</p>
          </div>
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-300 hover:text-coral-400 hover:bg-coral-500/10 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-ink-900/80 backdrop-blur-xl border-r border-ink-700/60 fixed h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 glass px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/image copy.png" alt="TrainX" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-display font-bold text-white">TrainX</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2">
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-ink-900 border-r border-ink-700/60 animate-slide-up">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 btn-ghost p-1.5 z-10">
              <X size={20} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
