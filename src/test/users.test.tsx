import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App";
import { AuthProvider } from "../features/auth/Auth";
import { storeSession } from "../lib/api";
import type { ManagedUser } from "../features/admin/Users";

const account: ManagedUser = {
  id: 2,
  nome: "João da Silva",
  email: "joao@example.com",
  ra: "123456",
  isActive: true,
  isAdmin: false,
  createdAt: "2026-01-01T00:00:00Z",
};
let people: ManagedUser[];
let calls: { path: string; method: string; body?: Record<string, unknown> }[];
function Location() {
  const loc = useLocation();
  return (
    <output data-testid="location">
      {loc.pathname}
      {loc.search}
    </output>
  );
}
function mount(
  path: string,
  admin = true,
  overrides: Record<string, unknown> = {},
) {
  storeSession({
    token: "test",
    user: {
      id: 1,
      nome: "Admin",
      email: "admin@example.com",
      ra: "111111",
      isAdmin: admin,
    },
  });
  const routes: Record<string, unknown> = {
    "/api/auth/me": { id: 1, isAdmin: admin },
    "/api/estudos/7": {
      id: 7,
      nome: "Estudo de teste",
      sigla: "ET",
      status: "EM_ANDAMENTO",
    },
    "/api/estudos/7/permissoes": [],
    "/api/estudos/7/participantes": [],
    "/api/estudos/7/participantes/excluidos": [],
    "/api/usuarios/pendentes": [{ ...account, isActive: false }],
    ...overrides,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method || "GET";
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ path: url, method, body });
      if (url === "/api/usuarios/2" && method === "PATCH")
        people = people.map((u) => (u.id === 2 ? { ...u, ...body } : u));
      if (url === "/api/usuarios/2" && method === "DELETE") {
        people = people.filter((u) => u.id !== 2);
        return new Response(null, { status: 204 });
      }
      const data =
        url === "/api/usuarios"
          ? people
          : url === "/api/usuarios/2"
            ? people.find((u) => u.id === 2)
            : routes[url];
      if (data === undefined)
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: "Unexpected route " + url },
          }),
          { status: 404 },
        );
      return new Response(JSON.stringify({ success: true, data }));
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Location />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  people = [account];
  calls = [];
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => vi.unstubAllGlobals());

describe("gestão de usuários e busca local", () => {
  it.each(["collector", "viewer"])(
    "vincula %s por nome, ignora acentos/caixa e envia ID",
    async (papel) => {
      mount("/estudos/7/permissoes");
      const user = userEvent.setup();
      await user.click(
        await screen.findByRole("button", { name: "Conceder acesso" }),
      );
      const input = await screen.findByRole("combobox", { name: "Usuário" });
      expect(screen.queryByLabelText("ID do usuário")).not.toBeInTheDocument();
      await user.type(input, "J");
      expect(
        screen.queryByRole("option", { name: "João da Silva" }),
      ).not.toBeInTheDocument();
      await user.type(input, "OAO");
      expect(
        await screen.findByRole("option", { name: "João da Silva" }),
      ).toBeVisible();
      await user.keyboard("{ArrowDown}{Enter}");
      await user.selectOptions(screen.getByLabelText("Permissão"), papel);
      await user.click(screen.getByRole("button", { name: "Salvar" }));
      await waitFor(() =>
        expect(calls.find((c) => c.method === "POST")?.body).toEqual({
          usuarioId: 2,
          papel,
        }),
      );
      expect(calls.filter((c) => c.path === "/api/usuarios")).toHaveLength(1);
    },
  );
  it("exige nova seleção quando o texto é editado", async () => {
    mount("/estudos/7/permissoes");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Conceder acesso" }),
    );
    const input = await screen.findByRole("combobox", { name: "Usuário" });
    await user.type(input, "jo");
    await user.click(screen.getByRole("option", { name: "João da Silva" }));
    await user.clear(input);
    await user.type(input, "Outra pessoa");
    await user.selectOptions(screen.getByLabelText("Permissão"), "viewer");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
  it("distingue homônimos por nascimento e não oferece vínculos ativos/excluídos", async () => {
    const person = {
      nome: "João da Silva",
      sexo: "MASCULINO",
      telefone: "45999999999",
    };
    mount("/estudos/7/participantes", true, {
      "/api/participantes": [
        { ...person, id: 42, nascimento: "2002-03-15T00:00:00Z" },
        { ...person, id: 43, nascimento: "2004-08-27T00:00:00Z" },
        { ...person, id: 44, nascimento: "1990-01-01" },
      ],
      "/api/estudos/7/participantes/excluidos": [{ participanteId: 44 }],
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Vincular participante" }),
    );
    await user.type(
      await screen.findByRole("combobox", { name: "Participante" }),
      "JOAO",
    );
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(
      screen.getByRole("option", { name: "João da Silva 15/03/2002" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("option", { name: "João da Silva 27/08/2004" }),
    );
    await user.click(screen.getByRole("button", { name: "Vincular" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")?.body).toEqual({
        participanteId: 43,
      }),
    );
  });
  it("pagina na URL e reutiliza a consulta ao buscar, navegar e voltar do detalhe", async () => {
    people = [
      account,
      ...Array.from({ length: 25 }, (_, i) => ({
        ...account,
        id: i + 3,
        nome: `Pessoa ${i}`,
        email: `pessoa${i}@example.com`,
      })),
    ];
    mount("/usuarios?page=2&size=25");
    const user = userEvent.setup();
    expect(await screen.findByText("Pessoa 24")).toBeInTheDocument();
    expect(screen.queryByText(account.nome)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    await user.type(screen.getByLabelText("Buscar usuários"), "JOAO");
    expect(screen.getByTestId("location")).toHaveTextContent("page=1");
    await user.click(screen.getByRole("link", { name: "Detalhes e edição" }));
    expect(
      await screen.findByRole("heading", { name: account.nome }),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/api/usuarios/2")).toBe(true);
    await user.click(
      screen.getByRole("link", { name: "← Voltar aos usuários" }),
    );
    expect(await screen.findByLabelText("Buscar usuários")).toHaveValue("JOAO");
    expect(calls.filter((c) => c.path === "/api/usuarios")).toHaveLength(1);
  });
  it("edita campos públicos com booleanos sem enviar senha", async () => {
    mount("/usuarios/2");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Editar usuário" }),
    );
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Nome completo"));
    await user.type(screen.getByLabelText("Nome completo"), "João Atualizado");
    await user.selectOptions(screen.getByLabelText("Status da conta"), "false");
    await user.selectOptions(screen.getByLabelText("Perfil da conta"), "true");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({
        nome: "João Atualizado",
        email: account.email,
        ra: account.ra,
        isActive: false,
        isAdmin: true,
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "João Atualizado" }),
    ).toBeInTheDocument();
  });
  it("exclusão 204 fecha confirmação, invalida lista e retorna à página correta", async () => {
    mount("/usuarios?page=1&size=25");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("link", { name: "Detalhes e edição" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Excluir usuário" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Excluir usuário",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Nenhum usuário encontrado" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/usuarios?page=1&size=25",
    );
    expect(calls.filter((c) => c.path === "/api/usuarios")).toHaveLength(2);
  });
  it("recusa acesso não admin sem consultar a lista", async () => {
    mount("/usuarios", false);
    expect(
      await screen.findByRole("heading", {
        name: "Acesso restrito a administradores",
      }),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/api/usuarios")).toBe(false);
  });
  it("mantém a tela de pendentes no submenu", async () => {
    mount("/usuarios/pendentes");
    expect(
      await screen.findByRole("button", { name: "Aprovar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Usuários pendentes" }),
    ).toHaveAttribute("href", "/usuarios/pendentes");
  });
});
