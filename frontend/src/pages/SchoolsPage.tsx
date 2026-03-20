import CrudPage, { Field } from "../components/CrudPage";
import { schoolsApi } from "../lib/api";

const DEFAULTS = {
  department: "Tarija",
  province: "Arce",
  municipality: "Bermejo",
  electoralSeat: "Bermejo",
  locality: "Bermejo",
  constituency: 42,
};

export default function SchoolsPage() {
  const fields: Field[] = [
    { key: "code", label: "Código", type: "number" },
    { key: "name", label: "Recinto Electoral", required: true, colSpan: true },
    { key: "shortName", label: "Nombre Abreviado" },
    { key: "department", label: "Departamento" },
    { key: "province", label: "Provincia" },
    { key: "municipality", label: "Municipio" },
    { key: "electoralSeat", label: "Asiento Electoral" },
    { key: "locality", label: "Localidad" },
    { key: "constituency", label: "Circunscripción", type: "number" },
  ];

  const columns = [
    {
      key: "code",
      label: "Código",
      render: (v: any) => <span className="font-medium text-black">{v || "—"}</span>,
    },
    { key: "name", label: "Recinto Electoral" },
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

