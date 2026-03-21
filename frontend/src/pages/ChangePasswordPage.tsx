import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../lib/api";
import { toast } from "../lib/toast";
import { useAuthStore } from "../store/auth.store";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      const message = "Completa todos los campos";
      setErrorMessage(message);
      return toast.error(message);
    }

    if (form.newPassword.length < 6) {
      const message = "La nueva contraseña debe tener al menos 6 caracteres";
      setErrorMessage(message);
      return toast.error(message);
    }

    if (form.newPassword !== form.confirmPassword) {
      const message = "La confirmación no coincide con la nueva contraseña";
      setErrorMessage(message);
      return toast.error(message);
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const result = await authApi.changePassword(
        form.currentPassword,
        form.newPassword,
      );
      updateUser(result.user);
      toast.success(result.message || "Contraseña actualizada");
      navigate("/");
    } catch (err: any) {
      const message =
        err.response?.data?.message || "No se pudo actualizar la contraseña";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-whiter px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-stroke bg-white p-8 shadow-default">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Actualiza tu contraseña</h1>
          <p className="mt-2 text-sm text-body">
            {user?.fullName}, debes cambiar tu contraseña inicial antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Contraseña actual</label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => {
                setErrorMessage("");
                setForm({ ...form, currentPassword: e.target.value });
              }}
              className="input"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => {
                setErrorMessage("");
                setForm({ ...form, newPassword: e.target.value });
              }}
              className="input"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => {
                setErrorMessage("");
                setForm({ ...form, confirmPassword: e.target.value });
              }}
              className="input"
              autoComplete="new-password"
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
            {loading ? "Actualizando..." : "Guardar nueva contraseña"}
          </button>
        </form>

        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          disabled={loading}
          className="mt-4 w-full text-sm text-body transition-colors hover:text-meta-1"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
