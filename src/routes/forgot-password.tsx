import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({ component: Forgot });

function Forgot() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("E-mail inválido");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Enviamos um link de recuperação para o seu e-mail");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar e-mail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-primary">ASTRO</span><span>TUR</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Recuperar senha</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.
            </p>
            <Link to="/login" className="inline-block text-sm text-primary hover:underline">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>E-mail cadastrado</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar link de recuperação
            </Button>
            <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
              Voltar ao login
            </Link>
          </form>
        )}
      </Card>
    </div>
  );
}
