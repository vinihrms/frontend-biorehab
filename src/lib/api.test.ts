import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  request,
  readSession,
  storeSession,
  UNAUTHORIZED_EVENT,
} from "./api";
const session = {
  token: "test-token",
  user: {
    id: 1,
    nome: "Ana",
    email: "ana@example.com",
    ra: "123456",
    isAdmin: true,
  },
};
afterEach(() => vi.unstubAllGlobals());
describe("cliente HTTP", () => {
  it("inclui Bearer e desembrulha data", async () => {
    storeSession(session);
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [1] })),
      );
    vi.stubGlobal("fetch", fetch);
    expect(await request("/estudos")).toEqual([1]);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer test-token",
    );
  });
  it("aceita sucesso sem data na aprovação", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true, message: "Ativado" })),
        ),
    );
    expect(
      await request("/usuarios/pendentes/2/aceitar", { method: "PATCH" }),
    ).toBeUndefined();
  });
  it("preserva erros por campo e mantém sessão no 403", async () => {
    storeSession(session);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "FORBIDDEN", message: "Sem acesso" },
          }),
          { status: 403 },
        ),
      ),
    );
    await expect(request("/estudos")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(readSession()).not.toBeNull();
  });
  it("invalida sessão expirada e notifica a aplicação", async () => {
    storeSession(session);
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    await expect(request("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(readSession()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });
  it("não encerra outra sessão ao receber resposta atrasada", async () => {
    storeSession(session);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        storeSession({ ...session, token: "new-token" });
        return new Response("{}", { status: 401 });
      }),
    );
    await expect(request("/estudos")).rejects.toBeInstanceOf(ApiError);
    expect(readSession()?.token).toBe("new-token");
  });
  it("expõe detalhes da validação 422", async () => {
    const details = [{ field: "nome", message: "Nome obrigatório" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Validação",
              details,
            },
          }),
          { status: 422 },
        ),
      ),
    );
    await expect(request("/estudos")).rejects.toMatchObject({ details });
  });
  it("distingue falha de rede de falha de validação", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(request("/estudos")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });
  it("lê CSV sem tentar desembrulhar JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("codigo,visita\nDJ-001,Baseline", {
          headers: { "Content-Type": "text/csv" },
        }),
      ),
    );
    const result = await request<Blob>("/estudos/1/exportar", {
      method: "POST",
      body: {},
      download: true,
    });
    expect(result.size).toBeGreaterThan(0);
  });
});
