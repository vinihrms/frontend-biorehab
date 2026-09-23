import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Brand, ErrorNotice, SchemaForm } from "../../components/ui";
import { loginSchema, registerSchema } from "../../domain/schemas";
import type { Session } from "../../domain/types";
import {
  ApiError,
  readSession,
  request,
  storeSession,
  UNAUTHORIZED_EVENT,
} from "../../lib/api";

const Context = createContext<{
  session: Session | null;
  loading: boolean;
  error: unknown;
  login: (s: Session) => void;
  logout: () => void;
  retry: () => void;
}>(null!);
export const useAuth = () => useContext(Context);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession);
  const [loading, setLoading] = useState(!!session);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const client = useQueryClient();
  const logout = () => {
    storeSession(null);
    setSession(null);
    setLoading(false);
    setError(null);
    void client.cancelQueries();
    client.clear();
  };
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  });
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    request<{ id: number; isAdmin: boolean }>("/auth/me", {
      signal: controller.signal,
    })
      .then((me) => {
        if (me.id !== session.user.id) {
          logout();
          return;
        }
        if (me.isAdmin !== session.user.isAdmin) {
          const next = {
            ...session,
            user: { ...session.user, isAdmin: me.isAdmin },
          };
          storeSession(next);
          setSession(next);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) logout();
        else {
          setError(e);
          setLoading(false);
        }
      });
    return () => controller.abort();
    // A session is revalidated when its token changes, not on every user-field update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, attempt]);
  return (
    <Context.Provider
      value={{
        session,
        loading,
        error,
        login: (s) => {
          client.clear();
          storeSession(s);
          setSession(s);
        },
        logout,
        retry: () => setAttempt((v) => v + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function Protected() {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.session)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (auth.loading)
    return (
      <div className="loading" role="status">
        Validando sua sessão…
      </div>
    );
  if (auth.error)
    return (
      <div className="standalone">
        <ErrorNotice error={auth.error} />
        <button className="btn" onClick={auth.retry}>
          Tentar novamente
        </button>
        <button className="btn secondary" onClick={auth.logout}>
          Voltar ao login
        </button>
      </div>
    );
  return <Outlet />;
}
export function AuthPage({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [created, setCreated] = useState(false);
  if (auth.session) return <Navigate to="/" replace />;
  const fields = [
    ...(register
      ? [
          {
            name: "nome",
            label: "Nome completo",
            placeholder: "Nome Sobrenome",
            autoComplete: "name",
          },
        ]
      : []),
    {
      name: "email",
      label: "Endereço de email",
      type: "email",
      placeholder: "nome@unioeste.br",
      autoComplete: "email",
    },
    ...(register
      ? [
          {
            name: "ra",
            label: "Registro acadêmico (RA)",
            placeholder: "123456",
          },
        ]
      : []),
    {
      name: "password",
      label: "Senha",
      type: "password",
      autoComplete: register ? "new-password" : "current-password",
      help: register ? "Use pelo menos 6 caracteres." : "",
    },
  ];
  return (
    <div className="auth-background">
      <div className="auth-card">
        <Brand />
        {created ? (
          <>
            <div className="success-mark">✓</div>
            <h1>Cadastro recebido</h1>
            <p className="muted my-5">
              Sua conta aguarda aprovação de um administrador. Assim que for
              aprovada, você poderá entrar com seu email e senha.
            </p>
            <Link className="btn" to="/login">
              Voltar ao login
            </Link>
          </>
        ) : (
          <>
            <p className="eyebrow mt-8">PESQUISA EM MOVIMENTO</p>
            <h1>{register ? "Crie sua conta" : "Bem-vindo de volta"}</h1>
            <p className="muted mb-7">
              {register
                ? "Faça parte da sua equipe de pesquisa."
                : "Acesse seus estudos e continue suas coletas."}
            </p>
            <SchemaForm
              key={String(register)}
              schema={register ? registerSchema : loginSchema}
              fields={fields}
              submitLabel={register ? "Criar conta" : "Entrar"}
              onSubmit={async (values) => {
                if (register) {
                  await request("/auth/cadastro", {
                    method: "POST",
                    body: values,
                    public: true,
                  });
                  setCreated(true);
                } else {
                  const s = await request<Session>("/auth/login", {
                    method: "POST",
                    body: values,
                    public: true,
                  });
                  auth.login(s);
                  const from = location.state?.from;
                  navigate(
                    typeof from === "string" &&
                      from.startsWith("/") &&
                      !from.startsWith("//")
                      ? from
                      : "/",
                    { replace: true },
                  );
                }
              }}
            />
            <p className="auth-switch">
              {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
              <Link to={register ? "/login" : "/cadastro"}>
                {register ? "Fazer login" : "Criar conta"}
              </Link>
            </p>
          </>
        )}
        <p className="auth-footer">BIOREHAB LAB · COLETA E GESTÃO CIENTÍFICA</p>
      </div>
    </div>
  );
}
