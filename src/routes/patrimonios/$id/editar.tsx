import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { PatrimonioForm } from "@/components/PatrimonioForm";

export const Route = createFileRoute("/patrimonios/$id/editar")({ component: Editar });

function Editar() {
  const { id } = useParams({ from: "/patrimonios/$id/editar" });
  const router = useRouter();
  const [item, setItem] = useState<any | null>(null);

  useEffect(() => {
    supabase.from("patrimonios").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => setItem(data));
  }, [id]);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Editar Patrimônio</h1>
      </div>
      {item ? (
        <PatrimonioForm initial={item} onSaved={(savedId) => router.navigate({ to: "/patrimonios/$id", params: { id: savedId } })} />
      ) : (
        <div className="text-muted-foreground">Carregando...</div>
      )}
    </AppLayout>
  );
}
