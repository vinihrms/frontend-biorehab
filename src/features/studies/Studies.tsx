import { useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
  NavLink,
  Outlet,
} from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookOpen,
  Plus,
  Search,
  Users,
  SlidersHorizontal,
  CalendarDays,
} from "lucide-react";
import {
  Badge,
  ConfirmAction,
  Empty,
  ErrorNotice,
  Modal,
  PageTitle,
  QueryState,
  SchemaForm,
  type Field,
} from "../../components/ui";
import { useResource, useWrite } from "../../lib/query";
import { ApiError, request } from "../../lib/api";
import { useAuth } from "../auth/Auth";
import { studySchema } from "../../domain/schemas";
import {
  active,
  formatDate,
  statusLabels,
  type Study,
  type Permission,
  type Participation,
  type Variable,
  type VisitType,
  type Status,
} from "../../domain/types";

const studyFields: Field[] = [
  { name: "nome", label: "Nome do estudo", placeholder: "Ex.: Dor no joelho" },
  {
    name: "sigla",
    label: "Sigla",
    placeholder: "Ex.: DJ1",
    help: "Até 10 caracteres, sem hífen.",
  },
  { name: "descricao", label: "Descrição", type: "textarea" },
  {
    name: "metaParticipantes",
    label: "Meta de participantes (opcional)",
    type: "number",
    help: "Quantidade de participantes esperada.",
  },
];
export function StudyForm({
  study,
  onDone,
}: {
  study?: Study;
  onDone: () => void;
}) {
  const mutation = useWrite();
  return (
    <SchemaForm
      schema={studySchema}
      fields={studyFields}
      initial={
        study
          ? {
              nome: study.nome,
              sigla: study.sigla,
              descricao: study.descricao || "",
              metaParticipantes: String(study.metaParticipantes ?? ""),
            }
          : undefined
      }
      onCancel={onDone}
      submitLabel={study ? "Salvar alterações" : "Criar estudo"}
      onSubmit={async (v) => {
        await mutation.mutateAsync({
          path: study ? `/estudos/${study.id}` : "/estudos",
          method: study ? "PATCH" : "POST",
          body: {
            ...v,
            metaParticipantes:
              v.metaParticipantes === ""
                ? undefined
                : Number(v.metaParticipantes),
          },
        });
        onDone();
      }}
    />
  );
}
function StudyCard({ study }: { study: Study }) {
  return (
    <article className="study-card">
      <div className="flex justify-between items-center gap-3">
        <span className="study-symbol">
          <BookOpen size={23} />
        </span>
        <Badge status={study.status} />
      </div>
      <p className="eyebrow mt-6">{study.sigla}</p>
      <h2 className="mt-2">{study.nome}</h2>
      <p className="study-description">
        {study.descricao || "Este estudo ainda não possui descrição."}
      </p>
      <div className="study-counts">
        <span>
          <SlidersHorizontal size={15} />
          {active(study.variaveis).length} variáveis
        </span>
        <span>
          <CalendarDays size={15} />
          {active(study.tipoVisitas).length} tipos de visita
        </span>
      </div>
      <div className="card-bottom">
        <span className="muted text-xs">
          Criado em {formatDate(study.createdAt)}
        </span>
        <Link to={`/estudos/${study.id}`} className="text-link">
          Detalhes <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}
export function StudiesPage({
  dashboard = false,
  exporting = false,
}: {
  dashboard?: boolean;
  exporting?: boolean;
}) {
  const { session } = useAuth();
  const [trash, setTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [create, setCreate] = useState(false);
  const query = useResource<Study[]>(`/estudos${trash ? "/excluidos" : ""}`);
  const studies = query.data || [];
  const rows = studies.filter(
    (s) =>
      `${s.nome} ${s.sigla}`.toLowerCase().includes(search.toLowerCase()) &&
      (!filter || s.status === filter),
  );
  return (
    <>
      <PageTitle
        title={
          dashboard ? "Visão geral" : exporting ? "Exportações" : "Estudos"
        }
        description={
          dashboard
            ? `Olá, ${session?.user.nome.split(" ")[0] || "pesquisador"}. Vamos continuar sua pesquisa?`
            : exporting
              ? "Selecione um estudo para preparar seus dados para análise."
              : "Acompanhe suas pesquisas, da preparação à coleta."
        }
        actions={
          !exporting &&
          session?.user.isAdmin && (
            <button className="btn" onClick={() => setCreate(true)}>
              <Plus size={18} />
              Criar estudo
            </button>
          )
        }
      />
      <QueryState query={query}>
        {dashboard && (
          <>
            <section className="welcome-banner">
              <div>
                <p className="eyebrow">CONHECIMENTO QUE TRANSFORMA</p>
                <h2>
                  Da primeira pergunta
                  <br />à próxima descoberta.
                </h2>
                <p>Seus estudos, participantes e coletas em um só lugar.</p>
              </div>
              <div className="banner-art" aria-hidden="true">
                <FlaskArt />
              </div>
            </section>
            <div className="stats-grid">
              {[
                {
                  label: "Estudos acessíveis",
                  value: studies.length,
                  icon: <BookOpen />,
                },
                {
                  label: "Em andamento",
                  value: studies.filter((s) => s.status === "EM_ANDAMENTO")
                    .length,
                  icon: <Users />,
                },
                {
                  label: "Em planejamento",
                  value: studies.filter((s) => s.status === "PLANEJAMENTO")
                    .length,
                  icon: <SlidersHorizontal />,
                },
              ].map((s) => (
                <div className="stat" key={s.label}>
                  <span className="stat-icon">{s.icon}</span>
                  <div>
                    <p className="muted">{s.label}</p>
                    <strong>{s.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="section-heading">
          <h2>
            {dashboard
              ? "Seus estudos"
              : trash
                ? "Estudos excluídos"
                : "Todas as pesquisas"}{" "}
            <span className="count">{rows.length}</span>
          </h2>
          {session?.user.isAdmin && !dashboard && !exporting && (
            <button className="btn secondary" onClick={() => setTrash(!trash)}>
              {trash ? "Ver ativos" : "Excluídos"}
            </button>
          )}
        </div>
        <div className="filter-row">
          <div className="searchbox">
            <Search size={18} />
            <input
              aria-label="Buscar estudos"
              placeholder="Buscar por nome ou sigla…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar por status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <Empty
            title={
              search || filter
                ? "Nenhum estudo corresponde à busca"
                : "Seu próximo estudo começa aqui"
            }
          >
            {session?.user.isAdmin
              ? "Crie um estudo para definir variáveis e iniciar a coleta."
              : "Os estudos compartilhados com você aparecerão aqui."}
          </Empty>
        ) : (
          <div className="cards-grid">
            {rows.map((s) =>
              trash ? (
                <article className="study-card" key={s.id}>
                  <h2>{s.nome}</h2>
                  <p className="muted mb-4">
                    {s.sigla} · Excluído em {formatDate(s.deletedAt)}
                  </p>
                  <ConfirmAction
                    path={`/estudos/${s.id}/restaurar`}
                    method="PATCH"
                    label="Restaurar"
                    description="Este estudo voltará à lista de ativos."
                  />
                </article>
              ) : exporting ? (
                <article className="study-card" key={s.id}>
                  <Badge status={s.status} />
                  <h2 className="my-4">{s.nome}</h2>
                  <Link className="btn" to={`/estudos/${s.id}/exportacao`}>
                    Preparar exportação <ArrowUpRight size={16} />
                  </Link>
                </article>
              ) : (
                <StudyCard key={s.id} study={s} />
              ),
            )}
          </div>
        )}
      </QueryState>
      {create && (
        <Modal title="Criar estudo" onClose={() => setCreate(false)}>
          <StudyForm onDone={() => setCreate(false)} />
        </Modal>
      )}
    </>
  );
}
function FlaskArt() {
  return (
    <svg viewBox="0 0 180 160" fill="none">
      <circle cx="90" cy="80" r="70" stroke="currentColor" opacity=".2" />
      <circle cx="90" cy="80" r="50" stroke="currentColor" opacity=".2" />
      <path
        d="M73 30h34m-26 0v44l-28 43c-5 8 0 17 10 17h57c10 0 15-9 10-17l-30-43V30M68 99h47"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="82" cy="116" r="4" fill="currentColor" />
      <circle cx="100" cy="108" r="3" fill="currentColor" />
    </svg>
  );
}
export interface StudyContext {
  study: Study;
  manage: boolean;
  permissions?: Permission[];
  collecting: boolean;
  planning: boolean;
}
export const useStudy = () => useOutletContext<StudyContext>();
export function StudyLayout() {
  const { studyId } = useParams();
  const id = Number(studyId);
  const valid = Number.isSafeInteger(id) && id > 0;
  const { session } = useAuth();
  const navigate = useNavigate();
  const query = useResource<Study>(`/estudos/${id}`, valid);
  const [edit, setEdit] = useState(false);
  const [status, setStatus] = useState(false);
  const [nextStatus, setNextStatus] = useState<Status>("PLANEJAMENTO");
  const write = useWrite();
  const permissions = useQuery({
    queryKey: ["api", `/estudos/${id}/permissoes`],
    enabled: valid && !!query.data,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await request<Permission[]>(`/estudos/${id}/permissoes`, {
          signal,
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) return null;
        throw e;
      }
    },
  });
  const manage =
    !!session?.user.isAdmin ||
    permissions.data?.some(
      (p) => p.usuarioId === session?.user.id && p.papel === "owner",
    ) === true;
  if (!valid) return <Empty title="Estudo inválido" />;
  return (
    <QueryState query={query}>
      {query.data && (
        <>
          <Link to="/estudos" className="back-link">
            ← Voltar aos estudos
          </Link>
          <PageTitle
            title={query.data.nome}
            description={`${query.data.sigla} · ${statusLabels[query.data.status]}`}
            actions={
              manage && (
                <>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      setNextStatus(query.data!.status);
                      write.reset();
                      setStatus(true);
                    }}
                  >
                    Atualizar status
                  </button>
                  <button
                    className="btn secondary"
                    disabled={query.data.status !== "PLANEJAMENTO"}
                    title={
                      query.data.status !== "PLANEJAMENTO"
                        ? "Edição disponível em planejamento"
                        : undefined
                    }
                    onClick={() => setEdit(true)}
                  >
                    Editar
                  </button>
                  <ConfirmAction
                    path={`/estudos/${id}`}
                    onDone={() => navigate("/estudos")}
                  />
                </>
              )
            }
          />
          <ErrorNotice error={permissions.error} />
          <nav className="tabs" aria-label="Seções do estudo">
            {[
              ["", "Informações"],
              ["participantes", "Participantes"],
              ["variaveis", "Variáveis"],
              ["tipos-visita", "Tipos de visita"],
              ["exportacao", "Exportação"],
              ...(manage ? [["permissoes", "Permissões"]] : []),
            ].map(([path, label]) => (
              <NavLink
                key={path}
                end={path === ""}
                to={`/estudos/${id}${path ? `/${path}` : ""}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Outlet
            context={
              {
                study: query.data,
                manage,
                permissions: permissions.data || undefined,
                collecting: query.data.status === "EM_ANDAMENTO",
                planning: query.data.status === "PLANEJAMENTO",
              } satisfies StudyContext
            }
          />
          {edit && (
            <Modal title="Editar estudo" onClose={() => setEdit(false)}>
              <StudyForm study={query.data} onDone={() => setEdit(false)} />
            </Modal>
          )}
          {status && (
            <Modal
              title="Atualizar status"
              onClose={() => {
                if (!write.isPending) setStatus(false);
              }}
            >
              <p className="muted mb-5">
                A fase do estudo determina quando é possível configurar sua
                estrutura ou iniciar novas coletas.
              </p>
              <label className="field">
                Novo status
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as Status)}
                >
                  {Object.entries(statusLabels).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <ErrorNotice error={write.error} />
              <div className="form-actions">
                <button
                  className="btn secondary"
                  onClick={() => setStatus(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn"
                  disabled={write.isPending}
                  onClick={() =>
                    write.mutate(
                      {
                        path: `/estudos/${id}/status`,
                        method: "PATCH",
                        body: { status: nextStatus },
                      },
                      { onSuccess: () => setStatus(false) },
                    )
                  }
                >
                  Confirmar mudança
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
    </QueryState>
  );
}
export function StudyOverview() {
  const { study, permissions } = useStudy();
  const variables = useResource<Variable[]>(`/estudos/${study.id}/variaveis`);
  const types = useResource<VisitType[]>(`/estudos/${study.id}/tipos-visita`);
  const participants = useResource<Participation[]>(
    `/estudos/${study.id}/participantes`,
  );
  return (
    <>
      <div className="overview-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Sobre a pesquisa</h2>
            <Badge status={study.status} />
          </div>
          <p className="muted whitespace-pre-wrap">
            {study.descricao || "Descrição não informada."}
          </p>
          <dl className="details-grid">
            <div>
              <dt>Sigla</dt>
              <dd>{study.sigla}</dd>
            </div>
            <div>
              <dt>Meta de participantes</dt>
              <dd>{study.metaParticipantes ?? "Não definida"}</dd>
            </div>
            <div>
              <dt>Criado em</dt>
              <dd>{formatDate(study.createdAt)}</dd>
            </div>
            <div>
              <dt>Última atualização</dt>
              <dd>{formatDate(study.updatedAt)}</dd>
            </div>
            {permissions?.find((p) => p.papel === "owner") && (
              <div>
                <dt>Responsável</dt>
                <dd>
                  {permissions.find((p) => p.papel === "owner")?.usuario.nome}
                </dd>
              </div>
            )}
          </dl>
        </section>
        <section className="panel">
          <p className="eyebrow">ACOMPANHAMENTO</p>
          <h2 className="my-3">Participantes</h2>
          <QueryState query={participants}>
            <strong className="big-number">{participants.data?.length}</strong>
            <p className="muted">participantes vinculados</p>
            {study.metaParticipantes && (
              <>
                <progress
                  className="mt-5"
                  max={study.metaParticipantes}
                  value={participants.data?.length || 0}
                />
                <p className="muted text-sm mt-2">
                  Meta de {study.metaParticipantes} participantes
                </p>
              </>
            )}
          </QueryState>
          <Link className="text-link mt-6" to="participantes">
            Ver participantes <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <div className="stats-grid">
        <section className="panel">
          <h3>Dicionário de dados</h3>
          <QueryState query={variables}>
            <p className="muted mt-2">
              {variables.data?.length} variáveis disponíveis para coleta.
            </p>
          </QueryState>
          <Link to="variaveis" className="text-link mt-5">
            Ver variáveis <ArrowUpRight size={16} />
          </Link>
        </section>
        <section className="panel">
          <h3>Momentos da pesquisa</h3>
          <QueryState query={types}>
            <p className="muted mt-2">
              {types.data?.length} tipos de visita definidos.
            </p>
          </QueryState>
          <Link to="tipos-visita" className="text-link mt-5">
            Ver tipos de visita <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
