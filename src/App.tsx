import { Fragment, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router";
import {
  BookOpen,
  LayoutDashboard,
  Users,
  UserCheck,
  Download,
  LogOut,
  Menu,
  X,
  FlaskConical,
} from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  AuthPage,
  AuthProvider,
  Protected,
  useAuth,
} from "./features/auth/Auth";
import {
  StudiesPage,
  StudyLayout,
  StudyOverview,
} from "./features/studies/Studies";
import {
  ParticipantsPage,
  StudyParticipants,
} from "./features/participants/Participants";
import { VariablesPage, VisitTypesPage } from "./features/studies/Structure";
import { PermissionsPage } from "./features/studies/Permissions";
import { ExportPage } from "./features/studies/Export";
import { CollectionPage } from "./features/collection/Collection";
import { PendingUsersPage } from "./features/admin/PendingUsers";
import { UserDetailPage, UsersLayout, UsersPage } from "./features/admin/Users";
import { Brand, Empty } from "./components/ui";
import { queryClient } from "./lib/query";

function Shell() {
  const { session, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const links = [
    { to: "/", label: "Visão geral", icon: LayoutDashboard },
    { to: "/estudos", label: "Estudos", icon: BookOpen },
    { to: "/participantes", label: "Participantes", icon: Users },
    ...(session?.user.isAdmin
      ? [{ to: "/usuarios", label: "Usuários", icon: UserCheck }]
      : []),
    { to: "/exportacoes", label: "Exportações", icon: Download },
  ];
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Pular para conteúdo
      </a>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar navegação"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Link to="/" aria-label="RehabDATA início">
            <Brand />
          </Link>
          <button
            className="mobile-only icon-btn"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <p className="nav-caption">ESPAÇO DE PESQUISA</p>
        <nav aria-label="Navegação principal">
          {links.map(({ to, label, icon: Icon }) => (
            <Fragment key={to}>
              <NavLink
                key={to}
                to={to}
                end={to === "/" || to === "/usuarios"}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                {label}
              </NavLink>
              {to === "/usuarios" &&
                location.pathname.startsWith("/usuarios") && (
                  <NavLink
                    className="nav-submenu"
                    to="/usuarios/pendentes"
                    onClick={() => setOpen(false)}
                  >
                    Usuários pendentes
                  </NavLink>
                )}
            </Fragment>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="lab-note">
            <FlaskConical size={19} />
            <div>
              <strong>BioRehab Lab</strong>
              <p>Ciência que move pessoas.</p>
            </div>
          </div>
          <button onClick={logout} className="logout">
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="mobile-only icon-btn"
              aria-label="Abrir menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <p className="header-caption">
              PLATAFORMA DE PESQUISA <span>/</span>{" "}
              {location.pathname.startsWith("/estudos")
                ? "Estudos"
                : "RehabDATA"}
            </p>
          </div>
          <div className="user-block">
            <div className="avatar">
              {session?.user.nome?.slice(0, 2).toUpperCase() || "RD"}
            </div>
            <div>
              <strong>{session?.user.nome || "Pesquisador"}</strong>
              <p>{session?.user.isAdmin ? "Administrador" : "Pesquisador"}</p>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>RehabDATA · BioRehab Lab</span>
          <span>Pesquisa em movimento.</span>
        </footer>
      </div>
    </div>
  );
}
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/cadastro" element={<AuthPage key="register" register />} />
      <Route element={<Protected />}>
        <Route element={<Shell />}>
          <Route index element={<StudiesPage dashboard />} />
          <Route path="estudos" element={<StudiesPage />} />
          <Route path="estudos/:studyId" element={<StudyLayout />}>
            <Route index element={<StudyOverview />} />
            <Route path="participantes" element={<StudyParticipants />} />
            <Route
              path="participantes/visitas/:participantId"
              element={<CollectionPage />}
            />
            <Route path="variaveis" element={<VariablesPage />} />
            <Route path="tipos-visita" element={<VisitTypesPage />} />
            <Route path="permissoes" element={<PermissionsPage />} />
            <Route path="exportacao" element={<ExportPage />} />
          </Route>
          <Route path="participantes" element={<ParticipantsPage />} />
          <Route path="usuarios" element={<UsersLayout />}>
            <Route index element={<UsersPage />} />
            <Route path="pendentes" element={<PendingUsersPage />} />
            <Route path=":userId" element={<UserDetailPage />} />
          </Route>
          <Route path="exportacoes" element={<StudiesPage exporting />} />
          <Route
            path="*"
            element={
              <Empty title="Página não encontrada">
                <Link className="text-link" to="/">
                  Voltar ao início
                </Link>
              </Empty>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
