import { useState } from "react";
import { Link, useParams } from "react-router";
import { Plus } from "lucide-react";
import {
  ConfirmAction,
  Empty,
  Modal,
  QueryState,
  SchemaForm,
  type Field,
} from "../../components/ui";
import {
  measurementBody,
  measurementSchema,
  visitSchema,
} from "../../domain/schemas";
import {
  dateOnly,
  formatDate,
  today,
  type Measurement,
  type Participation,
  type Variable,
  type Visit,
  type VisitType,
} from "../../domain/types";
import { useResource, useWrite } from "../../lib/query";
import { useStudy } from "../studies/Studies";

export function CollectionPage() {
  const { study, collecting } = useStudy();
  const { participantId } = useParams();
  const id = Number(participantId);
  const valid = Number.isSafeInteger(id) && id > 0;
  const participation = useResource<Participation>(
    `/estudos/${study.id}/participantes/${id}`,
    valid,
  );
  if (!valid) return <Empty title="Participante inválido" />;
  return (
    <>
      <Link to={`/estudos/${study.id}/participantes`} className="back-link">
        ← Voltar aos participantes
      </Link>
      <QueryState query={participation}>
        {participation.data && (
          <Visits participation={participation.data} collecting={collecting} />
        )}
      </QueryState>
    </>
  );
}
function Visits({
  participation,
  collecting,
}: {
  participation: Participation;
  collecting: boolean;
}) {
  const { study } = useStudy();
  const [trash, setTrash] = useState(false);
  const [edit, setEdit] = useState<Visit | "new" | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const path = `/participacoes/${participation.id}/visitas`;
  const query = useResource<Visit[]>(path + (trash ? "/excluidas" : ""));
  const types = useResource<VisitType[]>(`/estudos/${study.id}/tipos-visita`);
  const write = useWrite();
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{participation.codigo}</p>
          <h2>{participation.participante.nome}</h2>
          <p className="muted">Visitas e medições do participante</p>
        </div>
        <div className="actions">
          <button
            className="btn secondary"
            onClick={() => {
              setTrash(!trash);
              setSelected(null);
            }}
          >
            {trash ? "Visitas ativas" : "Visitas excluídas"}
          </button>
          {collecting && !trash && (
            <button className="btn" onClick={() => setEdit("new")}>
              <Plus size={17} />
              Nova visita
            </button>
          )}
        </div>
      </div>
      {!collecting && (
        <p className="notice">
          Novas visitas e medições exigem estudo em andamento.
        </p>
      )}
      <QueryState query={query}>
        {query.data?.length ? (
          <div className="visit-list">
            {query.data.map((v) => (
              <article
                className={`visit-card ${selected === v.id ? "selected" : ""}`}
                key={v.id}
              >
                <div>
                  <p className="eyebrow">{formatDate(v.data)}</p>
                  <h3>{v.tipoVisita?.nome || `Visita ${v.id}`}</h3>
                  <p className="muted whitespace-pre-wrap">
                    {v.notes || "Sem observações"}
                  </p>
                </div>
                <div className="actions">
                  {trash ? (
                    <ConfirmAction
                      path={`${path}/${v.id}/restaurar`}
                      method="PATCH"
                      label="Restaurar"
                      description="A visita e suas medições ficarão acessíveis novamente."
                    />
                  ) : (
                    <>
                      <button
                        className="btn small"
                        onClick={() => setSelected(v.id)}
                      >
                        Medições
                      </button>
                      <button
                        className="btn small secondary"
                        onClick={() => setEdit(v)}
                      >
                        Editar
                      </button>
                      <ConfirmAction
                        path={`${path}/${v.id}`}
                        onDone={() => setSelected(null)}
                      />
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title={
              trash ? "Nenhuma visita excluída" : "Nenhuma visita registrada"
            }
          />
        )}
      </QueryState>
      {selected && !trash && <Measurements key={selected} visitId={selected} />}{" "}
      {edit && (
        <Modal
          title={edit === "new" ? "Nova visita" : "Editar visita"}
          onClose={() => {
            if (!write.isPending) setEdit(null);
          }}
        >
          <QueryState query={types}>
            <SchemaForm
              schema={visitSchema}
              fields={[
                {
                  name: "tipoVisitaId",
                  label: "Tipo de visita",
                  type: "select",
                  disabled: edit !== "new",
                  options: [
                    ...(types.data || []),
                    ...(edit !== "new" &&
                    edit.tipoVisita &&
                    !types.data?.some((t) => t.id === edit.tipoVisitaId)
                      ? [edit.tipoVisita]
                      : []),
                  ].map((t) => ({ value: String(t.id), label: t.nome })),
                },
                { name: "data", label: "Data da visita", type: "date" },
                {
                  name: "notes",
                  label: "Observações (opcional)",
                  type: "textarea",
                },
              ]}
              initial={
                edit === "new"
                  ? { data: today() }
                  : {
                      tipoVisitaId: String(edit.tipoVisitaId),
                      data: dateOnly(edit.data),
                      notes: edit.notes || "",
                    }
              }
              onSubmit={async (v) => {
                await write.mutateAsync({
                  path: edit === "new" ? path : `${path}/${edit.id}`,
                  method: edit === "new" ? "POST" : "PATCH",
                  body: {
                    ...(edit === "new"
                      ? { tipoVisitaId: Number(v.tipoVisitaId) }
                      : {}),
                    data: v.data,
                    notes: v.notes,
                  },
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
function Measurements({ visitId }: { visitId: number }) {
  const { study, collecting } = useStudy();
  const path = `/visitas/${visitId}/medicoes`;
  const [trash, setTrash] = useState(false);
  const [edit, setEdit] = useState<{
    variable: Variable;
    measurement?: Measurement;
  } | null>(null);
  const query = useResource<Measurement[]>(path);
  const deleted = useResource<Measurement[]>(`${path}/excluidas`);
  const variables = useResource<Variable[]>(`/estudos/${study.id}/variaveis`);
  const write = useWrite();
  const allVariables = [
    ...(variables.data || []),
    ...(query.data || [])
      .filter((m) => !variables.data?.some((v) => v.id === m.variavelId))
      .map((m) => m.variavel),
  ];
  const displayed = trash
    ? (deleted.data || []).map((m) => ({
        variable: m.variavel,
        measurement: m,
      }))
    : allVariables.map((v) => ({
        variable: v,
        measurement: query.data?.find((m) => m.variavelId === v.id),
      }));
  return (
    <section className="panel mt-7">
      <div className="section-heading">
        <div>
          <p className="eyebrow">COLETA DE DADOS</p>
          <h2>Medições da visita</h2>
        </div>
        <button className="btn secondary" onClick={() => setTrash(!trash)}>
          {trash ? "Ver medições" : "Medições excluídas"}
        </button>
      </div>
      <QueryState query={variables}>
        <QueryState query={query}>
          <QueryState query={deleted}>
            {displayed.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Variável</th>
                      <th>Valor</th>
                      <th>Unidade</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(({ variable: v, measurement: m }) => {
                      const removed = deleted.data?.find(
                        (d) => d.variavelId === v.id,
                      );
                      const value = m?.valorNum ?? m?.valorText;
                      return (
                        <tr key={v.id}>
                          <td>
                            <strong>{v.nome}</strong>
                            {v.deletedAt && (
                              <p className="muted text-xs">Variável excluída</p>
                            )}
                          </td>
                          <td>
                            {value == null ? (
                              <span className="muted">
                                {removed ? "Medição excluída" : "Não coletado"}
                              </span>
                            ) : v.dataType === "boolean" ? (
                              value === "true" ? (
                                "Sim"
                              ) : (
                                "Não"
                              )
                            ) : (
                              String(value)
                            )}
                          </td>
                          <td>{v.unidade || "—"}</td>
                          <td>
                            <div className="actions">
                              {trash && m ? (
                                <ConfirmAction
                                  path={`${path}/${m.id}/restaurar`}
                                  method="PATCH"
                                  label="Restaurar"
                                  description="A medição ficará disponível novamente."
                                />
                              ) : (
                                <>
                                  {(m ||
                                    (collecting &&
                                      !removed &&
                                      !v.deletedAt)) && (
                                    <button
                                      className="btn small secondary"
                                      onClick={() =>
                                        setEdit({ variable: v, measurement: m })
                                      }
                                    >
                                      {m ? "Editar" : "Coletar"}
                                    </button>
                                  )}
                                  {m && (
                                    <ConfirmAction path={`${path}/${m.id}`} />
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title={
                  trash
                    ? "Nenhuma medição excluída"
                    : "Nenhuma variável configurada"
                }
              />
            )}
          </QueryState>
        </QueryState>
      </QueryState>
      {edit && (
        <Modal
          title={`${edit.measurement ? "Editar" : "Coletar"} · ${edit.variable.nome}`}
          onClose={() => {
            if (!write.isPending) setEdit(null);
          }}
        >
          <SchemaForm
            schema={measurementSchema(edit.variable)}
            fields={[measurementField(edit.variable)]}
            initial={{
              value: String(
                edit.measurement?.valorNum ?? edit.measurement?.valorText ?? "",
              ),
            }}
            onSubmit={async (v) => {
              await write.mutateAsync({
                path: edit.measurement
                  ? `${path}/${edit.measurement.id}`
                  : path,
                method: edit.measurement ? "PATCH" : "POST",
                body: {
                  ...(!edit.measurement
                    ? { variavelId: edit.variable.id }
                    : {}),
                  ...measurementBody(edit.variable, v.value),
                },
              });
              setEdit(null);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
export function measurementField(v: Variable): Field {
  return {
    name: "value",
    label: v.unidade ? `Valor (${v.unidade})` : "Valor",
    type: ["numeric", "integer"].includes(v.dataType)
      ? "number"
      : ["boolean", "choice"].includes(v.dataType)
        ? "select"
        : "textarea",
    step: v.dataType === "integer" ? "1" : "0.0001",
    options:
      v.dataType === "boolean"
        ? [
            { value: "true", label: "Sim" },
            { value: "false", label: "Não" },
          ]
        : v.options
            ?.split(",")
            .map((o) => ({ value: o.trim(), label: o.trim() })),
  };
}
