import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { z } from "zod";
import {
  ConfirmAction,
  Empty,
  Modal,
  PageTitle,
  QueryState,
  SchemaForm,
} from "../../components/ui";
import { normalizeSearch } from "../../components/Autocomplete";
import { formatDate } from "../../domain/types";
import { useResource, useWrite } from "../../lib/query";
import { useAuth } from "../auth/Auth";

export interface ManagedUser {
  id: number;
  nome: string;
  email: string;
  ra: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export function UsersLayout() {
  const { session } = useAuth();
  return session?.user.isAdmin ? (
    <Outlet />
  ) : (
    <Empty title="Acesso restrito a administradores" />
  );
}

export function UsersPage() {
  const query = useResource<ManagedUser[]>("/usuarios");
  const [params, setParams] = useSearchParams();
  const search = params.get("q") || "";
  const parsedPage = Number(params.get("page") || 1);
  const requestedPage =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const parsedSize = Number(params.get("size") || 25);
  const size = [10, 25, 50].includes(parsedSize) ? parsedSize : 25;
  const filtered = useMemo(
    () =>
      (query.data || []).filter((u) =>
        normalizeSearch(`${u.nome} ${u.email} ${u.ra}`).includes(
          normalizeSearch(search),
        ),
      ),
    [query.data, search],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const page = Math.min(requestedPage, pages);
  useEffect(() => {
    if (
      query.data &&
      (params.get("page") !== String(page) ||
        params.get("size") !== String(size))
    ) {
      const next = new URLSearchParams(params);
      next.set("page", String(page));
      next.set("size", String(size));
      setParams(next, { replace: true });
    }
  }, [query.data, page, size, params, setParams]);
  function update(key: string, value: string, replace = false) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next, { replace });
  }
  return (
    <>
      <PageTitle
        title="Usuários"
        description="Consulte e gerencie as contas da plataforma."
        actions={
          <Link className="btn secondary" to="pendentes">
            Usuários pendentes
          </Link>
        }
      />
      <div className="filter-row">
        <div className="searchbox">
          <input
            aria-label="Buscar usuários"
            placeholder="Buscar por nome, email ou RA…"
            value={search}
            onChange={(e) => update("q", e.target.value, true)}
          />
        </div>
        <label>
          Por página{" "}
          <select
            aria-label="Usuários por página"
            value={size}
            onChange={(e) => update("size", e.target.value)}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <QueryState query={query}>
        {filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>RA</th>
                  <th>Status</th>
                  <th>Perfil</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * size, page * size).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.nome}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.ra}</td>
                    <td>{u.isActive ? "Ativo" : "Inativo"}</td>
                    <td>{u.isAdmin ? "Administrador" : "Pesquisador"}</td>
                    <td>
                      <Link
                        className="btn small secondary"
                        to={`${u.id}?${params}`}
                      >
                        Detalhes e edição
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nenhum usuário encontrado" />
        )}
        <nav aria-label="Paginação de usuários" className="users-pagination">
          <button
            className="btn secondary"
            disabled={page <= 1}
            onClick={() => update("page", String(page - 1))}
          >
            Anterior
          </button>
          <span role="status">
            Página {page} de {pages} · {filtered.length} usuário(s)
          </span>
          <button
            className="btn secondary"
            disabled={page >= pages}
            onClick={() => update("page", String(page + 1))}
          >
            Próxima
          </button>
        </nav>
      </QueryState>
    </>
  );
}

const userSchema = z.object({
  nome: z.string().trim().min(2).max(150),
  email: z.email().max(254),
  ra: z.string().length(6, "O RA deve ter 6 caracteres."),
  isActive: z.enum(["true", "false"]),
  isAdmin: z.enum(["true", "false"]),
});

export function UserDetailPage() {
  const { userId } = useParams();
  const valid =
    /^\d+$/.test(userId || "") &&
    Number.isSafeInteger(Number(userId)) &&
    Number(userId) > 0;
  const query = useResource<ManagedUser>(`/usuarios/${userId}`, valid);
  const write = useWrite();
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [edit, setEdit] = useState(false);
  const back = `/usuarios?${params}`;
  if (!valid) return <Empty title="Usuário inválido" />;
  const user = query.data;
  return (
    <>
      <Link className="back-link" to={back}>
        ← Voltar aos usuários
      </Link>
      <PageTitle
        title="Detalhes do usuário"
        description="Informações da conta cadastrada."
      />
      <QueryState query={query}>
        {user && (
          <section className="panel">
            <h2>{user.nome}</h2>
            <dl className="details-grid">
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>RA</dt>
                <dd>{user.ra}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{user.isActive ? "Ativo" : "Inativo"}</dd>
              </div>
              <div>
                <dt>Perfil</dt>
                <dd>{user.isAdmin ? "Administrador" : "Pesquisador"}</dd>
              </div>
              <div>
                <dt>Cadastrado em</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
            <div className="actions mt-5">
              <button className="btn secondary" onClick={() => setEdit(true)}>
                Editar usuário
              </button>
              {auth.session?.user.id !== user.id ? (
                <ConfirmAction
                  path={`/usuarios/${user.id}`}
                  label="Excluir usuário"
                  description={`Excluir definitivamente a conta de ${user.nome}? As permissões de acesso serão removidas. Esta ação não pode ser desfeita.`}
                  onDone={() => navigate(back, { replace: true })}
                />
              ) : (
                <p className="muted">
                  Não é possível excluir sua própria conta.
                </p>
              )}
            </div>
            {edit && (
              <Modal
                title="Editar usuário"
                onClose={() => {
                  if (!write.isPending) setEdit(false);
                }}
              >
                <SchemaForm
                  schema={userSchema}
                  fields={[
                    { name: "nome", label: "Nome completo" },
                    { name: "email", label: "Email", type: "email" },
                    { name: "ra", label: "RA" },
                    {
                      name: "isActive",
                      label: "Status da conta",
                      type: "select",
                      options: [
                        { value: "true", label: "Ativo" },
                        { value: "false", label: "Inativo" },
                      ],
                    },
                    {
                      name: "isAdmin",
                      label: "Perfil da conta",
                      type: "select",
                      options: [
                        { value: "true", label: "Administrador" },
                        { value: "false", label: "Pesquisador" },
                      ],
                    },
                  ]}
                  initial={{
                    nome: user.nome,
                    email: user.email,
                    ra: user.ra,
                    isActive: String(user.isActive),
                    isAdmin: String(user.isAdmin),
                  }}
                  onSubmit={async (v) => {
                    const body = {
                      nome: v.nome,
                      email: v.email,
                      ra: v.ra,
                      isActive: v.isActive === "true",
                      isAdmin: v.isAdmin === "true",
                    };
                    await write.mutateAsync({
                      path: `/usuarios/${user.id}`,
                      method: "PATCH",
                      body,
                    });
                    setEdit(false);
                    if (auth.session?.user.id === user.id) {
                      if (!body.isActive || !body.isAdmin) auth.logout();
                      else
                        auth.login({
                          ...auth.session,
                          user: {
                            ...auth.session.user,
                            nome: body.nome,
                            email: body.email,
                            ra: body.ra,
                          },
                        });
                    }
                  }}
                />
              </Modal>
            )}
          </section>
        )}
      </QueryState>
    </>
  );
}
