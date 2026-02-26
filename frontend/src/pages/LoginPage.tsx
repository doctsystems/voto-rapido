import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await authApi.login(data.username, data.password);
      setAuth(result.accessToken, result.user);
      toast.success(`Bienvenido, ${result.user.fullName}`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-800 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-700 opacity-50" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-accent-500 opacity-10" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-400 rounded-2xl mb-4">
            <span className="text-brand-800 font-bold text-3xl font-display">V</span>
          </div>
          <h1 className="text-white font-display font-bold text-3xl">VotoRápido</h1>
          <p className="text-brand-100 text-sm mt-1 opacity-80">Sistema de Conteo Electoral</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="font-display font-bold text-xl text-brand-800 mb-6">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Usuario o Email</label>
              <input
                className="input"
                placeholder="ingresa tu usuario"
                {...register('username', { required: 'Requerido' })}
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('password', { required: 'Requerido' })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              Acceso exclusivo para personal electoral autorizado
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 bg-white/10 rounded-xl p-4">
          <p className="text-white/70 text-xs font-mono mb-2">Demo:</p>
          <div className="space-y-1 text-xs font-mono text-white/80">
            <div>admin / admin123 (Admin)</div>
            <div>jefe_mpu / jefe123 (Jefe Campaña)</div>
            <div>delegado_mpu_M001 / delegado123 (Delegado)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
