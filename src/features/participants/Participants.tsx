import { useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Crud } from "../../components/Crud";
import {
  ConfirmAction,
  Empty,
  ErrorNotice,
  Modal,
  PageTitle,
  QueryState,
  SchemaForm,
} from "../../components/ui";
import { participantSchema } from "../../domain/schemas";
import {
  dateOnly,
  formatDate,
  sexLabels,
  type Participant,
  type Participation,
} from "../../domain/types";
import { useResource, useWrite } from "../../lib/query";
import { useStudy } from "../studies/Studies";
import { z } from "zod";

export function ParticipantsPage() {
  return (
    <>
      <PageTitle
        title="Participantes"
        description="Cadastro compartilhado dos participantes das pesquisas."
      />
      <Crud<Participant>
        path="/participantes"
        title="Cadastro de participantes"
        singular="participante"
        schema={participantSchema}
        fields={[
          { name: "nome", label: "Nome completo" },
          {
            name: "telefone",
            label: "Telefone com DDD",
            type: "tel",
            help: "Somente números, de 10 a 15 dígitos.",
          },
          {
            name: "sexo",
            label: "Sexo",
            type: "select",
            options: Object.entries(sexLabels).map(([value, label]) => ({
              value,
              label,
            })),
          },
          { name: "nascimento", label: "Nascimento", type: "date" },
        ]}
        initial={(p) => ({
          nome: p.nome,
          telefone: p.telefone,
          sexo: p.sexo,
          nascimento: dateOnly(p.nascimento),
        })}
        columns={[
          { title: "Nome", cell: (p) => <strong>{p.nome}</strong> },
          { title: "Telefone", cell: (p) => p.telefone },
          { title: "Sexo", cell: (p) => sexLabels[p.sexo] },
          { title: "Nascimento", cell: (p) => formatDate(p.nascimento) },
        ]}
      />
    </>
  );
}
export function StudyParticipants() {
  const { study, collecting } = useStudy();
  const [trash, setTrash] = useState(false);
  const [add, setAdd] = useState(false);
  const [search, setSearch] = useState("");
  const path = `/estudos/${study.id}/participantes`;
  const rows = useResource<Participation[]>(path + (trash ? "/excluidos" : ""));
  const allLinks = useResource<Participation[]>(path, add);
  const deletedLinks = useResource<Participation[]>(path + "/excluidos", add);
  const all = useResource<Participant[]>("/participantes", add);
  const write = useWrite();
  const options =
    all.data
      ?.filter(
        (p) =>
          ![...(allLinks.data || []), ...(deletedLinks.data || [])].some(
            (link) => link.participanteId === p.id,
          ),
      )
      .map((p) => ({
        value: String(p.id),
        label: p.nome,
        description: formatDate(p.nascimento),
      })) || [];
  const filtered =
    rows.data?.filter((p) =>
      `${p.codigo} ${p.participante.nome}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Participantes do estudo</h2>
          <p className="muted">
            Cada participante recebe um código exclusivo nesta pesquisa.
          </p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => setTrash(!trash)}>
            {trash ? "Ver ativos" : "Excluídos"}
          </button>
          {collecting && !trash && (
            <button className="btn" onClick={() => setAdd(true)}>
              <Plus size={17} />
              Vincular participante
            </button>
          )}
        </div>
      </div>
      {!collecting && (
        <p className="notice">
          Novos vínculos ficam disponíveis quando o estudo está em andamento.
        </p>
      )}
      <div className="searchbox">
        <input
          aria-label="Buscar participantes do estudo"
          placeholder="Buscar por nome ou código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <QueryState query={rows}>
        {filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Sexo</th>
                  <th>Nascimento</th>
                  <th>Vinculado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="code">{p.codigo}</span>
                    </td>
                    <td>
                      <strong>{p.participante.nome}</strong>
                    </td>
                    <td>{sexLabels[p.participante.sexo]}</td>
                    <td>{formatDate(p.participante.nascimento)}</td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <div className="actions">
                        {trash ? (
                          <ConfirmAction
                            path={`${path}/${p.participanteId}/restaurar`}
                            method="PATCH"
                            label="Restaurar"
                            description="O vínculo ficará ativo novamente."
                          />
                        ) : (
                          <>
                            <Link
                              className="btn small secondary"
                              to={`visitas/${p.participanteId}`}
                            >
                              Visitas e coleta
                            </Link>
                            {collecting && (
                              <ConfirmAction
                                path={`${path}/${p.participanteId}`}
                                label="Desvincular"
                                description="O participante continuará no cadastro global. Vínculos com visitas não podem ser removidos."
                              />
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nenhum participante nesta lista" />
        )}
      </QueryState>
      {add && (
        <Modal
          title="Vincular participante"
          onClose={() => {
            if (!write.isPending) setAdd(false);
          }}
        >
          <p className="muted mb-4">
            Selecione uma pessoa do cadastro global. Precisa cadastrar alguém?{" "}
            <Link className="text-link" to="/participantes">
              Abrir participantes
            </Link>
          </p>
          <ErrorNotice error={allLinks.error || deletedLinks.error} />
          <QueryState query={all}>
            {allLinks.isPending || deletedLinks.isPending ? (
              <p role="status">Conferindo vínculos…</p>
            ) : allLinks.error || deletedLinks.error ? (
              <button
                className="btn secondary"
                onClick={() => {
                  void allLinks.refetch();
                  void deletedLinks.refetch();
                }}
              >
                Tentar novamente
              </button>
            ) : options.length ? (
              <SchemaForm
                fields={[
                  {
                    name: "participanteId",
                    label: "Participante",
                    type: "autocomplete",
                    options,
                  },
                ]}
                schema={z.object({
                  participanteId: z
                    .string()
                    .min(1, "Selecione um participante."),
                })}
                submitLabel="Vincular"
                onSubmit={async (v) => {
                  await write.mutateAsync({
                    path,
                    body: { participanteId: Number(v.participanteId) },
                  });
                  setAdd(false);
                }}
              />
            ) : (
              <Empty title="Nenhum participante disponível">
                Cadastre uma pessoa ou restaure um vínculo excluído.
              </Empty>
            )}
          </QueryState>
        </Modal>
      )}
    </>
  );
}
