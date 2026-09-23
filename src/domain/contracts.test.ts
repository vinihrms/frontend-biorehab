import { describe, expect, it } from "vitest";
import {
  measurementBody,
  measurementSchema,
  participantSchema,
  studySchema,
} from "./schemas";
import { dateOnly, formatDate, type Variable } from "./types";

const variable = (
  dataType: Variable["dataType"],
  options: string | null = null,
): Variable => ({
  id: 1,
  estudoId: 2,
  nome: "Teste",
  dataType,
  options,
  unidade: null,
  createdAt: "",
});
describe("contratos de coleta", () => {
  it("envia booleanos como texto, incluindo false", () => {
    expect(measurementBody(variable("boolean"), "false")).toEqual({
      valorText: "false",
    });
    expect(
      measurementSchema(variable("boolean")).safeParse({ value: "false" })
        .success,
    ).toBe(true);
  });
  it("envia zero numérico sem confundir com ausência", () => {
    expect(measurementBody(variable("numeric"), "0")).toEqual({ valorNum: 0 });
    expect(
      measurementSchema(variable("numeric")).safeParse({ value: "0" }).success,
    ).toBe(true);
  });
  it("rejeita números vazios, inteiros fracionados, overflow e precisão excessiva", () => {
    for (const [type, value] of [
      ["numeric", ""],
      ["integer", "1.5"],
      ["numeric", "1000000"],
      ["numeric", "0.00001"],
    ] as const)
      expect(
        measurementSchema(variable(type)).safeParse({ value }).success,
      ).toBe(false);
  });
  it("valida a opção contra a string CSV do backend", () => {
    const schema = measurementSchema(
      variable("choice", "Leve, Moderada, Intensa"),
    );
    expect(schema.safeParse({ value: "Moderada" }).success).toBe(true);
    expect(schema.safeParse({ value: "Outra" }).success).toBe(false);
  });
  it("preserva datas de calendário independentemente do fuso", () => {
    expect(dateOnly("2006-10-04T00:00:00.000Z")).toBe("2006-10-04");
    expect(formatDate("2006-10-04T00:00:00.000Z")).toBe("04/10/2006");
  });
  it("não transforma meta vazia em zero", () => {
    expect(
      studySchema.safeParse({
        nome: "Pesquisa",
        sigla: "DJ",
        descricao: "",
        metaParticipantes: "",
      }).success,
    ).toBe(true);
    expect(
      studySchema.safeParse({
        nome: "Pesquisa",
        sigla: "DJ",
        descricao: "",
        metaParticipantes: "0",
      }).success,
    ).toBe(false);
  });
  it("protege o limite real do banco e rejeita nascimento futuro", () => {
    const p = {
      nome: "Participante",
      telefone: "45999999999",
      sexo: "OUTRO",
      nascimento: "2000-01-01",
    };
    expect(participantSchema.safeParse(p).success).toBe(true);
    expect(
      participantSchema.safeParse({ ...p, nome: "A".repeat(31) }).success,
    ).toBe(false);
    expect(
      participantSchema.safeParse({ ...p, nascimento: "2999-01-01" }).success,
    ).toBe(false);
  });
});
