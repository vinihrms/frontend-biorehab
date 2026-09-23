export type Status =
  "PLANEJAMENTO" | "EM_ANDAMENTO" | "COLETA_ENCERRADA" | "ARQUIVADO";
export type Role = "owner" | "collector" | "viewer";
export type DataType = "numeric" | "integer" | "text" | "boolean" | "choice";
export interface RecordBase {
  id: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
export interface User {
  id: number;
  nome: string;
  email: string;
  ra: string;
  isAdmin: boolean;
}
export interface Session {
  user: User;
  token: string;
}
export interface Study extends RecordBase {
  nome: string;
  sigla: string;
  descricao: string | null;
  metaParticipantes: number | null;
  status: Status;
  variaveis?: Variable[];
  tipoVisitas?: VisitType[];
  participacoes?: Participation[];
  permissoes?: Permission[];
}
export interface Participant extends RecordBase {
  nome: string;
  telefone: string;
  sexo: "MASCULINO" | "FEMININO" | "OUTRO";
  nascimento: string;
}
export interface Participation extends RecordBase {
  estudoId: number;
  participanteId: number;
  codigo: string;
  participante: Participant;
}
export interface Variable extends RecordBase {
  nome: string;
  unidade: string | null;
  dataType: DataType;
  options: string | null;
  estudoId: number;
}
export interface VisitType extends RecordBase {
  nome: string;
  descricao: string | null;
  estudoId: number;
}
export interface Visit extends RecordBase {
  data: string;
  notes: string | null;
  tipoVisitaId: number;
  participacaoEstudoId: number;
  tipoVisita?: VisitType;
}
export interface Measurement extends RecordBase {
  visitaId: number;
  variavelId: number;
  valorNum: string | number | null;
  valorText: string | null;
  variavel: Variable;
}
export interface Permission extends RecordBase {
  usuarioId: number;
  estudoId: number;
  papel: Role;
  usuario: Pick<User, "nome" | "email" | "ra">;
}
export interface PendingUser extends RecordBase {
  nome: string;
  email: string;
  ra: string;
  isActive: boolean;
}
export const statusLabels: Record<Status, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_ANDAMENTO: "Em andamento",
  COLETA_ENCERRADA: "Coleta encerrada",
  ARQUIVADO: "Arquivado",
};
export const typeLabels: Record<DataType, string> = {
  numeric: "Número decimal",
  integer: "Número inteiro",
  boolean: "Sim / Não",
  text: "Texto",
  choice: "Lista de opções",
};
export const sexLabels = {
  MASCULINO: "Masculino",
  FEMININO: "Feminino",
  OUTRO: "Outro",
};
export const active = <T extends { deletedAt?: string | null }>(
  rows: T[] = [],
) => rows.filter((row) => !row.deletedAt);
export const dateOnly = (value: string) => value.slice(0, 10);
export function formatDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = dateOnly(value).split("-");
  return `${d}/${m}/${y}`;
}
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
