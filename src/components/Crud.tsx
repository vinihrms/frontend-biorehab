import { useState, type ReactNode } from "react";
import type { z } from "zod";
import { Plus, Search } from "lucide-react";
import { useResource, useWrite } from "../lib/query";
import {
  ConfirmAction,
  Empty,
  Modal,
  QueryState,
  SchemaForm,
  type Field,
} from "./ui";

export interface CrudRow {
  id: number;
  nome?: string;
  deletedAt?: string | null;
}
export function Crud<T extends CrudRow>({
  path,
  title,
  singular,
  schema,
  fields,
  columns,
  initial,
  body = (v) => v,
  canWrite = true,
  canCreate = true,
  canTrash = true,
  excluded = "excluidos",
}: {
  path: string;
  title: string;
  singular: string;
  schema: z.ZodType;
  fields: Field[];
  columns: { title: string; cell: (row: T) => ReactNode }[];
  initial?: (row: T) => Record<string, string>;
  body?: (values: Record<string, string>) => unknown;
  canWrite?: boolean;
  canCreate?: boolean;
  canTrash?: boolean;
  excluded?: string;
}) {
  const [trash, setTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<T | "new" | null>(null);
  const query = useResource<T[]>(`${path}${trash ? `/${excluded}` : ""}`);
  const mutation = useWrite();
  const rows = (query.data || []).filter((row) =>
    (row.nome || "").toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p className="muted text-sm">
            {trash
              ? "Registros excluídos"
              : "Organize os registros e mantenha as informações atualizadas."}
          </p>
        </div>
        <div className="actions">
          {canTrash && (
            <button className="btn secondary" onClick={() => setTrash(!trash)}>
              {trash ? "Ver ativos" : "Excluídos"}
            </button>
          )}
          {canWrite && canCreate && !trash && (
            <button className="btn" onClick={() => setEdit("new")}>
              <Plus size={17} />
              Adicionar {singular}
            </button>
          )}
        </div>
      </div>
      <div className="searchbox">
        <Search size={18} />
        <input
          aria-label={`Buscar ${title.toLowerCase()}`}
          placeholder="Buscar pelo nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <QueryState query={query}>
        {rows.length === 0 ? (
          <Empty
            title={
              trash ? "Nenhum registro excluído" : "Nenhum registro encontrado"
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.title}>{c.title}</th>
                  ))}
                  {canWrite && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => (
                      <td key={c.title}>{c.cell(row)}</td>
                    ))}
                    {canWrite && (
                      <td>
                        <div className="actions">
                          {trash ? (
                            <ConfirmAction
                              path={`${path}/${row.id}/restaurar`}
                              method="PATCH"
                              label="Restaurar"
                              description="O registro ficará disponível novamente."
                            />
                          ) : (
                            <>
                              <button
                                className="btn small secondary"
                                onClick={() => setEdit(row)}
                              >
                                Editar
                              </button>
                              <ConfirmAction path={`${path}/${row.id}`} />
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
      {edit && (
        <Modal
          title={`${edit === "new" ? "Adicionar" : "Editar"} ${singular}`}
          onClose={() => {
            if (!mutation.isPending) setEdit(null);
          }}
        >
          <SchemaForm
            fields={fields}
            schema={schema}
            initial={
              edit !== "new"
                ? initial?.(edit) ||
                  Object.fromEntries(
                    fields.map((f) => [
                      f.name,
                      String((edit as Record<string, unknown>)[f.name] ?? ""),
                    ]),
                  )
                : undefined
            }
            onCancel={() => setEdit(null)}
            onSubmit={async (values) => {
              await mutation.mutateAsync({
                path: edit === "new" ? path : `${path}/${edit.id}`,
                method: edit === "new" ? "POST" : "PATCH",
                body: body(values),
              });
              setEdit(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
