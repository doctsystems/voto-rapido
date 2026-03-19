import CrudPage, { Field } from "../components/CrudPage";
import { schoolsApi } from "../lib/api";

const DEFAULTS = {
  departamento: "Tarija",
  provincia: "Arce",
  municipio: "Bermejo",
  asientoElectoral: "Bermejo",
  localidad: "Bermejo",
  circunscripcion: 42,
};

export default function SchoolsPage() {
  const fields: Field[] = [
    { key: "codigoRecinto", label: "Código Recinto" },
    { key: "nombreRecinto", label: "Recinto Electoral", required: true, colSpan: true },
    { key: "nombreAbrev", label: "Nombre Abreviado" },
    { key: "departamento", label: "Departamento" },
    { key: "provincia", label: "Provincia" },
    { key: "municipio", label: "Municipio" },
    { key: "asientoElectoral", label: "Asiento Electoral" },
    { key: "localidad", label: "Localidad" },
    { key: "circunscripcion", label: "Circunscripción", type: "number" },
  ];

  const columns = [
    {
      key: "codigoRecinto",
      label: "Código",
      render: (v: any) => <span className="font-medium text-black">{v || "—"}</span>,
    },
    { key: "nombreRecinto", label: "Recinto Electoral" },
    {
      key: "tables",
      label: "Mesas",
      render: (v: any) => (Array.isArray(v) ? v.length : 0),
    },
  ];

  return (
    <CrudPage
      title="Recintos Electorales"
      description="Gestión de recintos donde se instalan las mesas de votación"
      queryKey={["schools"]}
      fetchFn={() => schoolsApi.getAll()}
      createFn={schoolsApi.create}
      updateFn={schoolsApi.update}
      deleteFn={schoolsApi.remove}
      fields={fields}
      columns={columns}
      defaultValues={DEFAULTS}
    />
  );
}
