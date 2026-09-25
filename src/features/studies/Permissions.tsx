import { useState } from "react";
import {
  ConfirmAction,
  Empty,
  Modal,
  QueryState,
  SchemaForm,
} from "../../components/ui";
import { permissionSchema } from "../../domain/schemas";
import type { Permission } from "../../domain/types";
import { useResource, useWrite } from "../../lib/query";
import { useAuth } from "../auth/Auth";
import type { ManagedUser } from "../admin/Users";
import { z } from "zod";
import { useStudy } from "./Studies";

export function PermissionsPage() {
  const { study, manage, permissions } = useStudy();
  const [edit, setEdit] = useState<Permission | "new" | null>(null);
  const mutation = useWrite();
  const { session } = useAuth();
  const users = useResource<ManagedUser[]>(
    "/usuarios",
    edit === "new" && !!session?.user.isAdmin,
  );
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
        <button
          className="btn"
          disabled={!session?.user.isAdmin}
          title={
            !session?.user.isAdmin
              ? "A busca de usuários exige uma conta administradora."
              : undefined
          }
          onClick={() => setEdit("new")}
        >
          Conceder acesso
        </button>
      </div>
      {!session?.user.isAdmin && (
        <p className="notice">
          Solicite a um administrador a inclusão de novos usuários. A API
          restringe a consulta de usuários a administradores; as permissões
          existentes podem ser gerenciadas abaixo.
        </p>
      )}
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
              ? "Busque pelo nome e selecione a pessoa que receberá acesso."
              : edit.usuario.nome}
          </p>
          <QueryState
            query={
              edit === "new"
                ? users
                : { isPending: false, error: null, refetch: () => undefined }
            }
          >
            <SchemaForm
              schema={
                edit === "new"
                  ? permissionSchema
                  : z.object({ papel: z.enum(["collector", "viewer"]) })
              }
              fields={[
                ...(edit === "new"
                  ? [
                      {
                        name: "usuarioId",
                        label: "Usuário",
                        type: "autocomplete",
                        options: users.data
                          ?.filter(
                            (u) =>
                              !permissions?.some((p) => p.usuarioId === u.id),
                          )
                          .map((u) => ({ value: String(u.id), label: u.nome })),
                      },
                    ]
                  : []),
                {
                  name: "papel",
                  label: "Permissão",
                  type: "select",
                  options: [
                    {
                      value: "collector",
                      label: "Coletor — consulta e coleta dados",
                    },
                    {
                      value: "viewer",
                      label: "Visualizador — somente consulta",
                    },
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
          </QueryState>
        </Modal>
      )}
    </>
  );
}
