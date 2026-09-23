import { useAuth } from "../auth/Auth";
import {
  ConfirmAction,
  Empty,
  PageTitle,
  QueryState,
} from "../../components/ui";
import { useResource } from "../../lib/query";
import { formatDate, type PendingUser } from "../../domain/types";

export function PendingUsersPage() {
  const { session } = useAuth();
  const query = useResource<PendingUser[]>(
    "/usuarios/pendentes",
    !!session?.user.isAdmin,
  );
  if (!session?.user.isAdmin)
    return <Empty title="Acesso restrito a administradores" />;
  return (
    <>
      <PageTitle
        title="Usuários pendentes"
        description="Revise as solicitações de acesso à plataforma."
      />
      <QueryState query={query}>
        {query.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>RA</th>
                  <th>Solicitado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.nome}</strong>
                      <p className="muted text-xs">ID {u.id}</p>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.ra}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="actions">
                        <ConfirmAction
                          path={`/usuarios/pendentes/${u.id}/aceitar`}
                          method="PATCH"
                          label="Aprovar"
                          description={`A conta de ${u.nome} poderá acessar a plataforma.`}
                        />
                        <ConfirmAction
                          path={`/usuarios/pendentes/${u.id}/recusar`}
                          label="Recusar"
                          description={`A solicitação de ${u.nome} será excluída definitivamente. A pessoa precisará se cadastrar novamente.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Tudo em dia">
            Não há solicitações de acesso aguardando aprovação.
          </Empty>
        )}
      </QueryState>
    </>
  );
}
