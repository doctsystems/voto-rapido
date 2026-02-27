import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const roleLabel: Record<string, string> = {
  ADMIN: 'Administrador',
  JEFE_CAMPANA: 'Jefe de Campaña',
  JEFE_RECINTO: 'Jefe de Recinto',
  DELEGADO: 'Delegado',
};

const roleBadge: Record<string, string> = {
  ADMIN: 'text-purple-300',
  JEFE_CAMPANA: 'text-blue-300',
  JEFE_RECINTO: 'text-teal-300',
  DELEGADO: 'text-green-300',
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const role = user?.role || '';

  const navItems = [
    { to: '/',              label: 'Dashboard',          icon: '⬡',  roles: ['ADMIN','JEFE_CAMPANA','JEFE_RECINTO','DELEGADO'] },
    { to: '/reports',       label: 'Reportes',           icon: '📋', roles: ['ADMIN','JEFE_CAMPANA','JEFE_RECINTO','DELEGADO'] },
    { to: '/reports/new',   label: 'Nuevo Reporte',      icon: '✚',  roles: ['DELEGADO','JEFE_RECINTO'] },
    { to: '/users',         label: 'Usuarios',           icon: '👥', roles: ['ADMIN','JEFE_CAMPANA','JEFE_RECINTO'] },
    { to: '/parties',       label: 'Partidos',           icon: '🏛', roles: ['ADMIN'] },
    { to: '/schools',       label: 'Recintos',           icon: '📍', roles: ['ADMIN'] },
    { to: '/tables',        label: 'Mesas',              icon: '🗳', roles: ['ADMIN'] },
    { to: '/election-types',label: 'Tipos de Elección',  icon: '📌', roles: ['ADMIN'] },
  ].filter(item => item.roles.includes(role));

  const Sidebar = () => (
    <aside className="w-64 bg-brand-800 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-brand-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent-400 rounded-lg flex items-center justify-center text-brand-800 font-bold text-lg">V</div>
          <div>
            <div className="text-white font-display font-bold text-lg leading-none">VotoRápido</div>
            <div className="text-brand-100 text-xs opacity-70">Sistema Electoral</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-brand-700 space-y-0.5">
        <div className="text-white font-medium text-sm truncate">{user?.fullName}</div>
        <div className={`text-xs font-mono ${roleBadge[role] || 'text-brand-100'}`}>
          {roleLabel[role] || role}
        </div>
        {user?.party && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.party.color }} />
            <span className="text-brand-100 text-xs opacity-80">{user.party.acronym}</span>
          </div>
        )}
        {user?.table && (
          <div className="text-brand-100 text-xs opacity-70">🗳 Mesa {user.table.tableNumber}</div>
        )}
        {user?.school && (
          <div className="text-brand-100 text-xs opacity-70 truncate">📍 {user.school.recintoElectoral}</div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-accent-500 text-white font-medium'
                  : 'text-brand-100 hover:bg-brand-700 hover:text-white'
              }`
            }
            onClick={() => setMobileOpen(false)}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-100 hover:bg-red-900 hover:text-red-200 transition-all"
        >
          <span>⏻</span> Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden lg:block"><Sidebar /></div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-brand-800 text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-xl">☰</button>
          <span className="font-display font-bold">VotoRápido</span>
        </header>
        <main className="flex-1 p-6"><Outlet /></main>
      </div>
    </div>
  );
}
