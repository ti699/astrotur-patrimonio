import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PatrimonioForm } from "@/components/PatrimonioForm";

export const Route = createFileRoute("/patrimonios/novo")({ component: Novo });

function Novo() {
  const router = useRouter();
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Novo Patrimônio</h1>
        <p className="text-sm text-muted-foreground">Cadastre um novo item no sistema</p>
      </div>
      <PatrimonioForm onSaved={(id) => router.navigate({ to: "/patrimonios/$id", params: { id } })} />
    </AppLayout>
  );
}
