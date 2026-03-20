export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#EFF2F7] px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-3xl border border-black/10 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,.06)]">
        <h1 className="text-3xl font-bold text-black">Privacy Policy</h1>
        <p className="mt-3 text-sm leading-6 text-body">
          Esta plataforma se usa para la gestion y consolidacion de informacion
          electoral. Los datos personales visibles dentro del sistema se limitan
          a los necesarios para la operacion, asignacion de usuarios y control
          de reportes.
        </p>
        <p className="mt-4 text-sm leading-6 text-body">
          Si necesitas actualizar, corregir o solicitar mas informacion sobre
          el tratamiento de datos en esta instalacion, contacta al
          administrador responsable del despliegue.
        </p>
      </div>
    </div>
  );
}
