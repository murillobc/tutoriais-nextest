import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { Check, ArrowLeft, Mail } from "lucide-react";

const verificationSchema = z.object({
  code: z.string().length(6, "Código deve ter 6 dígitos").regex(/^\d+$/, "Código deve conter apenas números"),
});

type VerificationForm = z.infer<typeof verificationSchema>;

export default function Verification() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setLocation("/login");
    }
  }, [setLocation]);

  const form = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  async function onSubmit(data: VerificationForm) {
    setIsLoading(true);
    try {
      await auth.verify({ email, code: data.code });
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao Portal de Tutoriais Nextest",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/me"] });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Código inválido ou expirado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function resendCode() {
    try {
      await auth.login({ email });
      toast({
        title: "Código reenviado",
        description: "Um novo código foi enviado para seu email",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao reenviar código",
        variant: "destructive",
      });
    }
  }

  if (!email) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-effect rounded-3xl shadow-2xl p-8 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-nextest-green rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-nextest-dark mb-2" data-testid="text-title">
            Código Enviado
          </h2>
          <p className="text-gray-600 text-sm">
            Verifique seu email e digite o código de 6 dígitos
          </p>
          <p className="text-nextest-blue text-sm font-medium mt-1" data-testid="text-email">
            {email}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-verification">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Código de Verificação
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-mono tracking-wider focus:border-nextest-blue focus:ring-0 focus:outline-none transition-all duration-300"
                      data-testid="input-code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-button text-white py-3 px-6 rounded-xl font-semibold hover:scale-[1.02] transition-all duration-300 shadow-lg"
              data-testid="button-verify"
            >
              <span className="flex items-center justify-center">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {isLoading ? "Verificando..." : "Verificar Código"}
              </span>
            </Button>
          </form>
        </Form>

        <div className="text-center mt-4">
          <button
            onClick={resendCode}
            className="text-sm text-gray-600 hover:text-nextest-blue transition-colors"
            data-testid="button-resend"
          >
            Não recebeu o código? <span className="font-medium">Reenviar</span>
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => setLocation("/login")}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center mx-auto"
            data-testid="link-back-login"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}
