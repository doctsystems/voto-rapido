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
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setErrorMessage("Completa todos los campos");
      return toast.error("Completa todos los campos");
    }

    setErrorMessage("");
    setLoading(true);
    try {
      const data = await authApi.login(form.username, form.password);
      setAuth(data.accessToken, data.user);
      // Invalidar queries específicas después del login
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      navigate(data.user?.mustChangePassword ? "/change-password" : "/");
    } catch (err: any) {
      const message = err.response?.data?.message || "Credenciales incorrectas";
      setErrorMessage(message);
      toast.error(message);
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
            <div className="flex h-20 lg:justify-start px-6 lg:px-8">
              <NavLink to="/" className="flex items-center gap-2">
                <img
                  src="/images/logo-01.svg"
                  alt="QuickTally"
                  className="lg:h-16 w-auto object-contain"
                />
              </NavLink>
            </div>
            <span className="text-bodydark text-sm ">
              Conteo veraz y transparente, en tiempo real.
            </span>
          </div>
        </div>

        {/* Right login form */}
        <div className="flex flex-1 items-center justify-center bg-whiter px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-10 flex flex-col items-center gap-3 text-center lg:hidden">
              {/* Logo */}
              <div className="flex max-w-xs">
                <NavLink to="/" className="flex items-center gap-2">
                  <img src="/images/logo.svg" alt="QuickTally" />
                </NavLink>
              </div>
              <span className="max-w-xs text-sm text-body lg:hidden">
                Conteo veraz y transparente, en tiempo real.
              </span>
            </div>

            <div className="mb-8 mt-8">
              <h2 className="text-3xl font-bold text-black">Iniciar sesión</h2>
              <p className="text-body mt-2">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Usuario</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => {
                    setErrorMessage("");
                    setForm({ ...form, username: e.target.value });
                  }}
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
                  onChange={(e) => {
                    setErrorMessage("");
                    setForm({ ...form, password: e.target.value });
                  }}
                  className="input"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              {errorMessage && (
                <div className="rounded-xl border border-meta-1/20 bg-meta-1/5 px-4 py-3 text-sm text-meta-1">
                  {errorMessage}
                </div>
              )}
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
              Elecciones Municipales y Departamentales
            </p>
            <p className="mt-1 text-center text-xs text-body">
              Bermejo, Tarija 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
