import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/auth";
import { UserPlus, ArrowLeft } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").endsWith("@nextest.com.br", "Apenas emails @nextest.com.br são permitidos"),
  department: z.string().min(1, "Selecione um departamento"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      department: "",
    },
  });

  async function onSubmit(data: RegisterForm) {
    setIsLoading(true);
    try {
      await auth.register(data);
      toast({
        title: "Conta criada com sucesso",
        description: "Você pode fazer login agora com seu email",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar conta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-effect rounded-3xl shadow-2xl p-8 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <img 
            src="https://educanextest.com.br/wp-content/uploads/2024/04/Group-13Logo-Horizontal-Educa-SVG-Fix.svg" 
            alt="Educa Nextest Logo" 
            className="w-48 mx-auto mb-6 drop-shadow-sm"
          />
          <h2 className="text-2xl font-semibold text-nextest-dark mb-2" data-testid="text-title">
            Criar Conta
          </h2>
          <p className="text-gray-600 text-sm">
            Apenas emails @nextest.com.br são permitidos
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-register">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Nome Completo
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Seu nome completo"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-nextest-blue focus:ring-0 focus:outline-none transition-all duration-300"
                      data-testid="input-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Email Corporativo
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seuemail@nextest.com.br"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-nextest-blue focus:ring-0 focus:outline-none transition-all duration-300"
                      data-testid="input-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Departamento
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger 
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-nextest-blue focus:ring-0 focus:outline-none transition-all duration-300"
                        data-testid="select-department"
                      >
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="engineering">Engenharia</SelectItem>
                      <SelectItem value="sales">Vendas</SelectItem>
                      <SelectItem value="support">Suporte</SelectItem>
                      <SelectItem value="management">Gerência</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-button text-white py-3 px-6 rounded-xl font-semibold hover:scale-[1.02] transition-all duration-300 shadow-lg"
              data-testid="button-register"
            >
              <span className="flex items-center justify-center">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {isLoading ? "Criando..." : "Criar Conta"}
              </span>
            </Button>
          </form>
        </Form>

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
