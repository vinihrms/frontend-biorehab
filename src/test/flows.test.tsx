import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../features/auth/Auth";
import { AppRoutes } from "../App";
import { storeSession } from "../lib/api";

const session = {
  token: "fixture-token",
  user: {
    id: 1,
    nome: "Ana Silva",
    email: "ana@example.com",
    ra: "123456",
    isAdmin: true,
  },
};
const study = {
  id: 7,
  nome: "Dor no joelho",
  sigla: "DJ",
  descricao: "Estudo longitudinal",
  status: "EM_ANDAMENTO",
  metaParticipantes: 70,
  createdAt: "2026-08-10T00:00:00Z",
  variaveis: [],
  tipoVisitas: [],
};
const participant = {
  id: 42,
  nome: "Maria Souza",
  telefone: "45999999999",
  sexo: "FEMININO",
  nascimento: "2000-04-03T00:00:00Z",
};
const participation = {
  id: 99,
  estudoId: 7,
  participanteId: 42,
  codigo: "DJ-001",
  participante: participant,
  createdAt: "2026-09-20T00:00:00Z",
};
const variable = {
  id: 4,
  nome: "Dor presente",
  dataType: "boolean",
  options: null,
  unidade: null,
  estudoId: 7,
};
const visit = {
  id: 9,
  participacaoEstudoId: 99,
  tipoVisitaId: 3,
  data: "2026-09-20T00:00:00Z",
  notes: "",
  tipoVisita: { id: 3, nome: "Baseline" },
};
let requests: {
  url: string;
  method: string;
  body: Record<string, unknown> | undefined;
}[];
function mockApi(overrides: Record<string, unknown> = {}) {
  requests = [];
  const routes: Record<string, unknown> = {
    "/api/auth/me": { id: 1, isAdmin: true },
    "/api/auth/login": session,
    "/api/auth/cadastro": { id: 2 },
    "/api/estudos": [study],
    "/api/estudos/7": study,
    "/api/estudos/7/permissoes": [],
    "/api/estudos/7/participantes": [participation],
    "/api/estudos/7/participantes/42": participation,
    "/api/estudos/7/variaveis": [variable],
    "/api/estudos/7/tipos-visita": [{ id: 3, nome: "Baseline" }],
    "/api/participacoes/99/visitas": [visit],
    "/api/visitas/9/medicoes": [],
    "/api/visitas/9/medicoes/excluidas": [],
    ...overrides,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options: RequestInit = {}) => {
      requests.push({
        url,
        method: options.method || "GET",
        body: options.body ? JSON.parse(String(options.body)) : undefined,
      });
      if (!(url in routes))
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: "Rota inesperada: " + url },
          }),
          { status: 404 },
        );
      return new Response(
        JSON.stringify({ success: true, data: routes[url] }),
        { headers: { "Content-Type": "application/json" } },
      );
    }),
  );
}
function mount(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => vi.unstubAllGlobals());
describe("fluxos da aplicação", () => {
  it("redireciona uma rota protegida para login", async () => {
    mockApi();
    mount("/estudos");
    expect(
      await screen.findByRole("heading", { name: "Bem-vindo de volta" }),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
  it("faz login e mostra os estudos", async () => {
    mockApi();
    mount("/login");
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Endereço de email"),
      "ana@example.com",
    );
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(
      await screen.findByRole("heading", { name: "Visão geral" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Dor no joelho" }),
    ).toBeInTheDocument();
    expect(requests.find((r) => r.url === "/api/auth/login")?.body).toEqual({
      email: "ana@example.com",
      password: "123456",
    });
  });
  it("apresenta conta inativa e permanece no login", async () => {
    requests = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: false,
              error: {
                code: "USER_INACTIVE",
                message: "Sua conta está inativa.",
              },
            }),
            { status: 403 },
          ),
      ),
    );
    mount("/login");
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Endereço de email"),
      "ana@example.com",
    );
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sua conta está inativa.",
    );
    expect(
      screen.getByRole("heading", { name: "Bem-vindo de volta" }),
    ).toBeInTheDocument();
  });
  it("cadastro não autentica automaticamente e informa aprovação pendente", async () => {
    mockApi();
    mount("/cadastro");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nome completo"), "Ana Silva");
    await user.type(
      screen.getByLabelText("Endereço de email"),
      "ana@example.com",
    );
    await user.type(screen.getByLabelText("Registro acadêmico (RA)"), "123456");
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(
      await screen.findByRole("heading", { name: "Cadastro recebido" }),
    ).toBeInTheDocument();
    expect(requests.some((r) => r.url === "/api/auth/login")).toBe(false);
    await user.click(screen.getByRole("link", { name: "Voltar ao login" }));
    expect(
      await screen.findByRole("heading", { name: "Bem-vindo de volta" }),
    ).toBeInTheDocument();
  });
  it("cria estudo convertendo meta em número", async () => {
    mockApi();
    storeSession(session);
    mount("/estudos");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Criar estudo" }),
    );
    await user.type(screen.getByLabelText("Nome do estudo"), "Nova pesquisa");
    await user.type(screen.getByLabelText("Sigla"), "NP");
    await user.type(
      screen.getByLabelText("Meta de participantes (opcional)"),
      "50",
    );
    const buttons = screen.getAllByRole("button", { name: "Criar estudo" });
    await user.click(buttons[buttons.length - 1]);
    await waitFor(() =>
      expect(
        requests.find((r) => r.method === "POST" && r.url === "/api/estudos")
          ?.body,
      ).toEqual({
        nome: "Nova pesquisa",
        sigla: "NP",
        descricao: "",
        metaParticipantes: 50,
      }),
    );
  });
  it("busca visitas pelo vínculo e salva booleano no endpoint da visita", async () => {
    mockApi();
    storeSession(session);
    mount("/estudos/7/participantes/visitas/42");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Medições" }));
    await user.click(await screen.findByRole("button", { name: "Coletar" }));
    await user.selectOptions(screen.getByLabelText("Valor"), "false");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(
        requests.find(
          (r) => r.method === "POST" && r.url === "/api/visitas/9/medicoes",
        )?.body,
      ).toEqual({ variavelId: 4, valorText: "false" }),
    );
    expect(
      requests.some((r) => r.url === "/api/participacoes/99/visitas"),
    ).toBe(true);
    expect(requests.some((r) => r.url.includes("/participacoes/42/"))).toBe(
      false,
    );
  });
  it("edita visita preservando tipo sem enviá-lo no PATCH", async () => {
    mockApi({ "/api/participacoes/99/visitas/9": visit });
    storeSession(session);
    mount("/estudos/7/participantes/visitas/42");
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "Medições" });
    const buttons = screen.getAllByRole("button", { name: "Editar" });
    await user.click(buttons[buttons.length - 1]);
    await user.type(
      await screen.findByLabelText("Observações (opcional)"),
      "Retorno",
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(
        requests.find(
          (r) =>
            r.method === "PATCH" && r.url === "/api/participacoes/99/visitas/9",
        )?.body,
      ).toEqual({ data: "2026-09-20", notes: "Retorno" }),
    );
  });
});
