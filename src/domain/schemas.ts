import { z } from "zod";
import { today, type Variable } from "./types";

z.config(z.locales.pt());

const required = z.string().trim().min(1, "Campo obrigatório.");
export const loginSchema = z.object({
  email: z.email("Informe um email válido."),
  password: z.string().min(1, "Informe sua senha."),
});
export const registerSchema = loginSchema.extend({
  nome: z.string().trim().min(2).max(150),
  email: z.email().max(254),
  ra: z.string().length(6, "O RA deve ter 6 caracteres."),
  password: z.string().min(6, "Use pelo menos 6 caracteres.").max(255),
});
export const studySchema = z.object({
  nome: z.string().trim().min(3).max(100),
  sigla: required
    .max(10)
    .regex(/^[^-]+$/, "Use uma sigla sem hífen para gerar os códigos."),
  descricao: z.string(),
  metaParticipantes: z
    .string()
    .refine(
      (v) =>
        v === "" ||
        (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 2147483647),
      "Informe um inteiro positivo.",
    ),
});
export const participantSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3)
    .max(30, "O banco de dados aceita até 30 caracteres."),
  telefone: z
    .string()
    .regex(/^\d{10,15}$/, "Informe de 10 a 15 dígitos, com DDD."),
  sexo: z.enum(["MASCULINO", "FEMININO", "OUTRO"]),
  nascimento: z.iso
    .date("Informe uma data válida.")
    .refine((v) => v <= today(), "A data não pode ser futura."),
});
export const variableSchema = z
  .object({
    nome: z.string().trim().min(2).max(100),
    unidade: z.string().max(20, "O banco de dados aceita até 20 caracteres."),
    dataType: z.enum(["numeric", "integer", "text", "boolean", "choice"]),
    options: z.string().max(200),
  })
  .refine(
    (v) =>
      v.dataType !== "choice" ||
      v.options.split(",").every((x) => x.trim().length > 0),
    {
      path: ["options"],
      message: "Informe opções não vazias separadas por vírgula.",
    },
  );
export const visitTypeSchema = z.object({
  nome: z.string().trim().min(3).max(100),
  descricao: z.string().max(200),
});
export const visitSchema = z.object({
  tipoVisitaId: required.regex(/^\d+$/).refine((v) => Number(v) > 0),
  data: z.iso.date("Informe uma data válida."),
  notes: z.string().max(1000),
});
export const permissionSchema = z.object({
  usuarioId: required
    .regex(/^\d+$/, "Informe o ID numérico.")
    .refine((v) => Number(v) > 0),
  papel: z.enum(["collector", "viewer"]),
});
export function measurementSchema(variable: Variable) {
  return z.object({
    value: z.string().superRefine((value, ctx) => {
      const fail = (message: string) =>
        ctx.addIssue({ code: "custom", message });
      if (variable.dataType === "numeric" || variable.dataType === "integer") {
        if (!value.trim() || !Number.isFinite(Number(value)))
          return fail("Informe um número válido.");
        if (Math.abs(Number(value)) > 999999.9999)
          return fail("O limite é 999999,9999.");
        if (variable.dataType === "integer" && !Number.isInteger(Number(value)))
          return fail("Informe um número inteiro.");
        if (
          variable.dataType === "numeric" &&
          Math.abs(Number(value) * 10000 - Math.round(Number(value) * 10000)) >
            0.00001
        )
          return fail("Use até 4 casas decimais.");
      } else if (
        variable.dataType === "boolean" &&
        !["true", "false"].includes(value)
      )
        fail("Selecione Sim ou Não.");
      else if (
        variable.dataType === "choice" &&
        !variable.options
          ?.split(",")
          .map((v) => v.trim())
          .includes(value)
      )
        fail("Selecione uma opção válida.");
      else if (variable.dataType === "text" && !value.trim())
        fail("Informe o valor.");
    }),
  });
}
export const measurementBody = (variable: Variable, value: string) =>
  ["numeric", "integer"].includes(variable.dataType)
    ? { valorNum: Number(value) }
    : { valorText: value };
