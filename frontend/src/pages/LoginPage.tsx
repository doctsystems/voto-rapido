import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "../lib/toast";
import { authApi } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { useQueryClient } from "@tanstack/react-query";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password)
      return toast.error("Completa todos los campos");
    setLoading(true);
    try {
      const data = await authApi.login(form.username, form.password);
      setAuth(data.accessToken, data.user);
      // Invalidar queries específicas después del login
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        {/* Left branding panel */}
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-primary p-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="relative z-10 text-center">
            {/* Logo */}
            <div className="flex h-20  lg:justify-start px-6 lg:px-8">
              <NavLink to="/" className="flex items-center gap-2">
                <img
                  src="/images/logo-01.svg"
                  alt="QuickTally"
                  className="lg:h-16 w-auto object-contain"
                />
              </NavLink>
            </div>
            <p className="text-bodydark text-lg max-w-sm mx-auto leading-relaxed">
              Sistema de Conteo Rápido Electoral
            </p>
            <div className="mt-12 grid grid-cols-3 gap-6">
              {[
                { icon: "🏫", label: "Recintos", value: "Múltiples" },
                { icon: "👥", label: "Partidos", value: "Todos" },
                { icon: "📊", label: "En vivo", value: "Real-time" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-white font-semibold text-sm">
                    {s.value}
                  </div>
                  <div className="text-bodydark text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right login form */}
        <div className="flex flex-1 items-center justify-center bg-whiter px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-xl font-bold text-black">VotoRápido</span>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-black">Iniciar sesión</h2>
              <p className="text-body mt-2">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Usuario o Email</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="input"
                  placeholder="tu.usuario"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Ingresando...
                  </span>
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-body">
              Elecciones Municipales y Departamentales - Bermejo, Tarija 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
