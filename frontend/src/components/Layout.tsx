import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { useQueryClient } from "@tanstack/react-query";
import AppFooter from "./AppFooter";

const roleLabel: Record<string, string> = {
  ADMIN: "Administrador",
  JEFE_CAMPANA: "Jefe de Campaña",
  JEFE_RECINTO: "Jefe de Recinto",
  DELEGADO: "Delegado",
};

const roleBadge: Record<string, string> = {
  ADMIN: "bg-primary/20 text-primary",
  JEFE_CAMPANA: "bg-meta-5/20 text-meta-5",
  JEFE_RECINTO: "bg-meta-3/20 text-meta-3",
  DELEGADO: "bg-meta-6/20 text-yellow-700",
};

const navSections = [
  {
    label: "Menu Principal",
    items: [
      {
        to: "/",
        icon: "❖",
        label: "Dashboard",
        roles: ["ADMIN", "JEFE_CAMPANA", "JEFE_RECINTO", "DELEGADO"],
      },
      {
        to: "/reports",
        icon: "◧",
        label: "Reportes",
        roles: ["ADMIN", "JEFE_CAMPANA", "JEFE_RECINTO", "DELEGADO"],
      },
      {
        to: "/reports/new",
        icon: "⊕",
        label: "Nuevo Reporte",
        roles: ["DELEGADO", "JEFE_RECINTO"],
      },
    ],
  },
  {
    label: "Gestión",
    items: [
      {
        to: "/users",
        icon: "◈",
        label: "Usuarios",
        roles: ["ADMIN", "JEFE_CAMPANA", "JEFE_RECINTO"],
      },
      { to: "/parties", icon: "◉", label: "Partidos", roles: ["ADMIN"] },
      {
        to: "/election-types",
        icon: "◎",
        label: "Tipos de Elección",
        roles: ["ADMIN"],
      },
    ],
  },
  {
    label: "Electoral",
    items: [
      { to: "/schools", icon: "◍", label: "Recintos", roles: ["ADMIN"] },
      { to: "/tables", icon: "▣", label: "Mesas", roles: ["ADMIN"] },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role || "";
  const handleLogout = () => {
    logout();
    // Invalidar queries al hacer logout
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["metrics"] });
    navigate("/login");
  };

  const visibleSections = navSections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => i.roles.includes(role)),
    }))
    .filter((s) => s.items.length > 0);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-20 shrink-0 items-center justify-center lg:justify-start px-6 lg:px-8 border-b border-stroke">
        <NavLink to="/" className="flex items-center gap-2">
          <img
            src="/images/logo.svg"
            alt="QuickTally"
            className="h-10 lg:h-16 w-auto object-contain"
          />
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <div className="nav-section text-gray-900">{section.label}</div>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/" || item.to === "/reports"}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `nav-item ${
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "text-gray-600 hover:bg-black/5 hover:text-gray-900"
                      }`
                    }
                  >
                    <span className="text-base w-5 text-center opacity-70">
                      {item.icon}
                    </span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t px-2 py-2">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left text-meta-1 hover:bg-meta-1/10 hover:text-meta-1"
        >
          <span className="w-5 text-center">⏻</span>
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 bg-white border-r min-h-screen">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-whiter">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b border-stroke bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[.06] text-black hover:bg-whiten"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3 9h12M3 4.5h12M3 13.5h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {/* Logo */}
          <div className="flex h-12 shrink-0 items-center justify-center lg:justify-start px-6 lg:px-8">
            <NavLink to="/" className="flex items-center gap-2">
              <img
                src="/images/logo.svg"
                alt="QuickTally"
                className="h-10 lg:h-16 w-auto object-contain"
              />
            </NavLink>
          </div>
          <div className="w-9" />
        </header>

        {/* Desktop topbar breadcrumb */}
        <header className="hidden lg:flex h-20 shrink-0 items-center justify-between border-b border-stroke bg-white px-8">
          {/* <div className="text-xl font-bold text-black tracking-wide ">
            Sistema de Conteo Electoral
          </div> */}
          <div className="text-2xl font-bold text-primary tracking-wide ">
            Plataforma de Resultados Electorales
          </div>
          <div className="flex items-center gap-3 text-sm text-body">
            <span className="font-medium text-black">{user?.fullName}</span>
            <div
              className={`text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary`}
            >
              {roleLabel[role]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
