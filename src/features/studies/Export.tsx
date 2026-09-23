import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { ErrorNotice, QueryState } from "../../components/ui";
import { useResource } from "../../lib/query";
import { downloadStudy } from "../../lib/api";
import type { Variable, VisitType } from "../../domain/types";
import { useStudy } from "./Studies";

export function ExportPage() {
  const { study } = useStudy();
  const variables = useResource<Variable[]>(`/estudos/${study.id}/variaveis`);
  const types = useResource<VisitType[]>(`/estudos/${study.id}/tipos-visita`);
  const [include, setInclude] = useState(false);
  const [selectedTypes, setTypes] = useState<number[]>([]);
  const [selectedVariables, setVariables] = useState<number[]>([]);
  const mutation = useMutation({
    mutationFn: () =>
      downloadStudy(study.id, {
        formato: "csv",
        incluirParticipantes: include,
        incluirVisitas: selectedTypes,
        incluirVariaveis: selectedVariables,
      }),
  });
  const toggle = (values: number[], id: number) =>
    values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
  return (
    <section className="panel export-panel">
      <span className="empty-icon">
        <FileSpreadsheet size={28} />
      </span>
      <h2 className="mt-4">Prepare seus dados para análise</h2>
      <p className="muted my-3">
        Baixe os dados de {study.nome} em formato CSV. Cada linha representa uma
        visita.
      </p>
      <QueryState query={variables}>
        <QueryState query={types}>
          <p className="notice">
            Protótipo: confira as colunas do CSV antes da análise. O exportador
            atual pode omitir variáveis ausentes na primeira visita exportada.
          </p>
          <div className="notice">
            Sem opções marcadas, todos os tipos de visita e todas as variáveis
            serão incluídos.
          </div>
          <div className="export-grid">
            <fieldset>
              <legend>Tipos de visita</legend>
              {types.data?.map((t) => (
                <label className="checkbox" key={t.id}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t.id)}
                    onChange={() => setTypes(toggle(selectedTypes, t.id))}
                  />
                  {t.nome}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Variáveis</legend>
              {variables.data?.map((v) => (
                <label className="checkbox" key={v.id}>
                  <input
                    type="checkbox"
                    checked={selectedVariables.includes(v.id)}
                    onChange={() =>
                      setVariables(toggle(selectedVariables, v.id))
                    }
                  />
                  {v.nome}
                </label>
              ))}
            </fieldset>
          </div>
          <label className="checkbox my-6">
            <input
              type="checkbox"
              checked={include}
              onChange={(e) => setInclude(e.target.checked)}
            />
            Incluir código, sexo e nascimento dos participantes
          </label>
          <ErrorNotice error={mutation.error} />
          {mutation.isSuccess && (
            <p className="notice success" role="status">
              Download preparado com sucesso.
            </p>
          )}
          <button
            className="btn"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Download size={17} />
            {mutation.isPending ? "Preparando…" : "Exportar CSV"}
          </button>
        </QueryState>
      </QueryState>
    </section>
  );
}
