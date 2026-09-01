import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useAuth, LOCAL_SESSION_KEY } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, type ReactNode } from "react";
import {
  LayoutDashboard, Package, FileBarChart, Building2, Users, Settings, LogOut, Plus, List, UserCircle, ShieldAlert, ArrowLeft,
  ArrowRightLeft, Wrench, History, ClipboardList, ClipboardCheck, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true, adminOnly: false },
  { to: "/patrimonios", label: "Patrimônios", icon: Package, adminOnly: false,
    children: [
      { to: "/patrimonios", label: "Listar", icon: List },
      { to: "/patrimonios/novo", label: "Novo Cadastro", icon: Plus },
    ],
  },
  { to: "/movimentacoes", label: "Movimentações", icon: ArrowRightLeft, adminOnly: false },
  { to: "/manutencoes", label: "Manutenções", icon: Wrench, adminOnly: false },
  { to: "/historico", label: "Histórico", icon: History, adminOnly: false },
  { to: "/inventario", label: "Inventário", icon: ClipboardCheck, adminOnly: false },
  { to: "/garantias", label: "Garantias", icon: ShieldCheck, adminOnly: false },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, adminOnly: false },
  { to: "/setores", label: "Setores", icon: Building2, adminOnly: false },
  { to: "/responsaveis", label: "Responsáveis", icon: Users, adminOnly: false },
  { to: "/auditoria", label: "Auditoria", icon: ClipboardList, adminOnly: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
  { to: "/perfil", label: "Meu Perfil", icon: UserCircle, adminOnly: false },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { session, loading, user, profile, isAdmin } = useAuth();
  const router = useRouter();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) router.navigate({ to: "/login" });
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  const handleLogout = async () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="text-2xl font-extrabold tracking-tight">
            <span className="text-primary">ASTRO</span>
            <span className="text-sidebar-foreground">TUR</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Patrimônio</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <div key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
                {item.children && active && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((c) => {
                      const CI = c.icon;
                      return (
                        <Link key={c.to} to={c.to}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                            location.pathname === c.to ? "text-primary" : "text-muted-foreground hover:text-sidebar-foreground"
                          )}>
                          <CI className="h-3 w-3" />{c.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs font-medium text-sidebar-foreground truncate">{profile?.nome || user?.email}</div>
          <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
            {isAdmin ? "Administrador" : "Usuário"}
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-extrabold">
          <span className="text-primary">ASTRO</span><span>TUR</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-muted-foreground">Sair</button>
      </div>

      <main className="flex-1 md:ml-0 mt-14 md:mt-0 overflow-x-hidden pb-20 md:pb-0">
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">{children}</div>
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex justify-around py-2 z-40">
          {items.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <Link key={item.to} to={item.to} className={cn("flex flex-col items-center text-xs gap-1 px-2", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-5 ring-4 ring-destructive/10">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Você não tem permissão para acessar esta área. Entre em contato com um administrador do sistema.
        </p>
        <Button onClick={() => router.history.back()} variant="outline" className="mt-6">
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}
