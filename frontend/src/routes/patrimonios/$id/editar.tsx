import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/services/api";
import { PatrimonioForm } from "@/components/PatrimonioForm";

export const Route = createFileRoute("/patrimonios/$id/editar")({ component: Editar });

function Editar() {
  const { id } = useParams({ from: "/patrimonios/$id/editar" });
  const router = useRouter();
  const [item, setItem] = useState<any | null>(null);

  useEffect(() => {
    api
      .get(`/patrimonios/${id}`)
      .then((response) => setItem(response.data))
      .catch((err) => console.error("Erro ao carregar património:", err));
  }, [id]);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Editar Patrimônio</h1>
      </div>
      {item ? (
        <PatrimonioForm
          initial={item}
          onSaved={(savedId) => router.navigate({ to: "/patrimonios/$id", params: { id: savedId } })}
        />
      ) : (
        <div className="text-muted-foreground">Carregando...</div>
      )}
    </AppLayout>
  );
}