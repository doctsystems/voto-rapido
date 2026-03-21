import CrudPage, { Field } from "../components/CrudPage";
import { schoolsApi } from "../lib/api";

export default function SchoolsPage() {
  const normalizeSchoolPayload = (data: any) => ({
    ...data,
    isActive:
      data.isActive === undefined || data.isActive === null || data.isActive === ""
        ? undefined
        : data.isActive === true || data.isActive === "true",
  });

  const fields: Field[] = [
    { key: "code", label: "Código", type: "number" },
    { key: "name", label: "Recinto Electoral", required: true, colSpan: true },
    { key: "shortName", label: "Nombre Abreviado" },
    { key: "tableCount", label: "Cantidad de Mesas", type: "number" },
    {
      key: "isActive",
      label: "Estado",
      type: "select",
      options: [
        { value: "true", label: "Activo" },
        { value: "false", label: "Inactivo" },
      ],
    },
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
      createFn={(data) => schoolsApi.create(normalizeSchoolPayload(data))}
      updateFn={(id, data) => schoolsApi.update(id, normalizeSchoolPayload(data))}
      deleteFn={schoolsApi.remove}
      fields={fields}
      columns={columns}
      defaultValues={{ isActive: "true" }}
    />
  );
}

