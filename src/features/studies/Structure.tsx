import { Crud } from "../../components/Crud";
import { variableSchema, visitTypeSchema } from "../../domain/schemas";
import { typeLabels, type Variable, type VisitType } from "../../domain/types";
import { useStudy } from "./Studies";

export function VariablesPage() {
  const { study, manage, planning } = useStudy();
  return (
    <>
      {!planning && (
        <p className="notice">
          A criação de variáveis está disponível apenas em planejamento.
        </p>
      )}
      <Crud<Variable>
        path={`/estudos/${study.id}/variaveis`}
        title="Dicionário de dados"
        singular="variável"
        schema={variableSchema}
        canWrite={manage}
        canCreate={planning}
        canTrash={manage}
        excluded="excluidas"
        fields={[
          {
            name: "nome",
            label: "Nome da variável",
            placeholder: "Ex.: Intensidade da dor",
          },
          {
            name: "unidade",
            label: "Unidade (opcional)",
            placeholder: "Ex.: cm, kg, pontos",
          },
          {
            name: "dataType",
            label: "Tipo de dado",
            type: "select",
            options: Object.entries(typeLabels).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            name: "options",
            label: "Opções da lista",
            help: "Para Lista de opções, separe os valores por vírgula. Ex.: Leve, Moderada, Intensa",
          },
        ]}
        columns={[
          { title: "Variável", cell: (v) => <strong>{v.nome}</strong> },
          { title: "Tipo", cell: (v) => typeLabels[v.dataType] },
          { title: "Unidade", cell: (v) => v.unidade || "—" },
          {
            title: "Opções",
            cell: (v) =>
              v.dataType === "choice" ? v.options || "Não definidas" : "—",
          },
        ]}
      />
    </>
  );
}
export function VisitTypesPage() {
  const { study, manage, planning } = useStudy();
  return (
    <>
      {!planning && (
        <p className="notice">
          A criação de tipos de visita está disponível apenas em planejamento.
        </p>
      )}
      <Crud<VisitType>
        path={`/estudos/${study.id}/tipos-visita`}
        title="Tipos de visita"
        singular="tipo de visita"
        schema={visitTypeSchema}
        canWrite={manage}
        canCreate={planning}
        fields={[
          {
            name: "nome",
            label: "Nome do momento",
            placeholder: "Ex.: Avaliação inicial",
          },
          {
            name: "descricao",
            label: "Descrição (opcional)",
            type: "textarea",
          },
        ]}
        columns={[
          { title: "Tipo de visita", cell: (v) => <strong>{v.nome}</strong> },
          { title: "Descrição", cell: (v) => v.descricao || "—" },
        ]}
      />
    </>
  );
}
