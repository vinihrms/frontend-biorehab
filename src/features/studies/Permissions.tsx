import { useState } from "react";
import { ConfirmAction, Empty, Modal, SchemaForm } from "../../components/ui";
import { permissionSchema } from "../../domain/schemas";
import type { Permission } from "../../domain/types";
import { useWrite } from "../../lib/query";
import { useStudy } from "./Studies";

export function PermissionsPage() {
  const { study, manage, permissions } = useStudy();
  const [edit, setEdit] = useState<Permission | "new" | null>(null);
  const mutation = useWrite();
  const path = `/estudos/${study.id}/permissoes`;
  if (!manage)
    return (
      <Empty title="Acesso restrito">
        Somente administradores e responsáveis podem gerenciar permissões.
      </Empty>
    );
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Equipe do estudo</h2>
          <p className="muted">Defina quem pode visualizar e coletar dados.</p>
        </div>
        <button className="btn" onClick={() => setEdit("new")}>
          Conceder acesso
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>RA</th>
              <th>Papel</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {permissions?.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.usuario.nome}</strong>
                </td>
                <td>{p.usuario.email}</td>
                <td>{p.usuario.ra}</td>
                <td>
                  {
                    {
                      owner: "Responsável",
                      collector: "Coletor",
                      viewer: "Visualizador",
                    }[p.papel]
                  }
                </td>
                <td>
                  {p.papel !== "owner" && (
                    <div className="actions">
                      <button
                        className="btn secondary small"
                        onClick={() => setEdit(p)}
                      >
                        Editar
                      </button>
                      <ConfirmAction
                        path={`${path}/${p.usuarioId}`}
                        label="Remover acesso"
                        description="O usuário deixará de ter acesso a este estudo. Essa permissão pode ser concedida novamente."
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal
          title={edit === "new" ? "Conceder acesso" : "Alterar permissão"}
          onClose={() => {
            if (!mutation.isPending) setEdit(null);
          }}
        >
          <p className="muted mb-5">
            {edit === "new"
              ? "Informe o ID de uma conta cadastrada, fornecido pelo administrador. A busca por nome ou email ainda não está disponível."
              : edit.usuario.nome}
          </p>
          <SchemaForm
            schema={permissionSchema}
            fields={[
              {
                name: "usuarioId",
                label: "ID do usuário",
                type: "number",
                disabled: edit !== "new",
              },
              {
                name: "papel",
                label: "Permissão",
                type: "select",
                options: [
                  {
                    value: "collector",
                    label: "Coletor — consulta e coleta dados",
                  },
                  { value: "viewer", label: "Visualizador — somente consulta" },
                ],
              },
            ]}
            initial={
              edit !== "new"
                ? { usuarioId: String(edit.usuarioId), papel: edit.papel }
                : undefined
            }
            onSubmit={async (v) => {
              await mutation.mutateAsync({
                path: edit === "new" ? path : `${path}/${edit.usuarioId}`,
                method: edit === "new" ? "POST" : "PATCH",
                body:
                  edit === "new"
                    ? { usuarioId: Number(v.usuarioId), papel: v.papel }
                    : { papel: v.papel },
              });
              setEdit(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
