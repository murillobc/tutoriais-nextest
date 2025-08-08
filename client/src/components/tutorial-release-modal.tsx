import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { X, User, Building, PlayCircle, Search, Check, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { InputMask } from "@/components/ui/input-mask";

const tutorialReleaseSchema = z.object({
  clientName: z.string().min(1, "Nome é obrigatório"),
  clientCpf: z.string().min(11, "CPF é obrigatório"),
  clientEmail: z.string().email("Email inválido"),
  clientPhone: z.string().optional(),
  companyName: z.string().min(1, "Nome da empresa é obrigatório"),
  companyRole: z.string().min(1, "Cargo é obrigatório"),
  tutorialIds: z.array(z.string()).min(1, "Selecione pelo menos um tutorial"),
});

type TutorialReleaseForm = z.infer<typeof tutorialReleaseSchema>;

interface Tutorial {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface TutorialReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialReleaseModal({ isOpen, onClose }: TutorialReleaseModalProps) {
  const [selectedTutorials, setSelectedTutorials] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TutorialReleaseForm>({
    resolver: zodResolver(tutorialReleaseSchema),
    defaultValues: {
      clientName: "",
      clientCpf: "",
      clientEmail: "",
      clientPhone: "",
      companyName: "",
      companyRole: "",
      tutorialIds: [],
    },
  });

  const { data: tutorials = [] } = useQuery<Tutorial[]>({
    queryKey: ["/api/tutorials"],
    enabled: isOpen,
  });

  const createReleaseMutation = useMutation({
    mutationFn: (data: TutorialReleaseForm) => 
      apiRequest("POST", "/api/tutorial-releases", data),
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Tutoriais liberados com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial-releases"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao liberar tutoriais",
        variant: "destructive",
      });
    },
  });

  const filteredTutorials = tutorials.filter(
    tutorial =>
      tutorial.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutorial.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutorial.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTutorial = (tutorialId: string) => {
    const newSelection = selectedTutorials.includes(tutorialId)
      ? selectedTutorials.filter(id => id !== tutorialId)
      : [...selectedTutorials, tutorialId];
    
    setSelectedTutorials(newSelection);
    form.setValue("tutorialIds", newSelection);
  };

  const handleClose = () => {
    form.reset();
    setSelectedTutorials([]);
    setSearchTerm("");
    onClose();
  };

  const onSubmit = (data: TutorialReleaseForm) => {
    createReleaseMutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-effect rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/20 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-nextest-dark">Nova Liberação de Tutorial</h2>
            <p className="text-gray-600 text-sm">Preencha os dados para liberar o acesso aos tutoriais</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            data-testid="button-close-modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Data Section */}
            <div className="form-section">
              <h3 className="text-lg font-semibold text-nextest-dark mb-4 flex items-center">
                <User className="mr-3 h-5 w-5 text-nextest-blue" />
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nome Completo *</Label>
                  <Input
                    id="clientName"
                    placeholder="Digite o nome completo"
                    {...form.register("clientName")}
                    data-testid="input-client-name"
                  />
                  {form.formState.errors.clientName && (
                    <p className="text-sm text-red-500">{form.formState.errors.clientName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientCpf">CPF *</Label>
                  <InputMask
                    id="clientCpf"
                    mask="cpf"
                    placeholder="000.000.000-00"
                    {...form.register("clientCpf")}
                    data-testid="input-client-cpf"
                  />
                  {form.formState.errors.clientCpf && (
                    <p className="text-sm text-red-500">{form.formState.errors.clientCpf.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="email@empresa.com"
                    {...form.register("clientEmail")}
                    data-testid="input-client-email"
                  />
                  {form.formState.errors.clientEmail && (
                    <p className="text-sm text-red-500">{form.formState.errors.clientEmail.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Telefone</Label>
                  <InputMask
                    id="clientPhone"
                    mask="phone"
                    placeholder="(11) 99999-9999"
                    {...form.register("clientPhone")}
                    data-testid="input-client-phone"
                  />
                </div>
              </div>
            </div>

            {/* Company Data Section */}
            <div className="form-section">
              <h3 className="text-lg font-semibold text-nextest-dark mb-4 flex items-center">
                <Building className="mr-3 h-5 w-5 text-nextest-blue" />
                Dados da Empresa
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Empresa *</Label>
                  <Input
                    id="companyName"
                    placeholder="Nome da empresa"
                    {...form.register("companyName")}
                    data-testid="input-company-name"
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-red-500">{form.formState.errors.companyName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyRole">Cargo *</Label>
                  <Input
                    id="companyRole"
                    placeholder="Seu cargo na empresa"
                    {...form.register("companyRole")}
                    data-testid="input-company-role"
                  />
                  {form.formState.errors.companyRole && (
                    <p className="text-sm text-red-500">{form.formState.errors.companyRole.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tutorials Selection Section */}
            <div className="form-section">
              <h3 className="text-lg font-semibold text-nextest-dark mb-4 flex items-center">
                <PlayCircle className="mr-3 h-5 w-5 text-nextest-blue" />
                Seleção de Tutoriais
              </h3>
              
              <div className="glass-card rounded-xl p-6 border border-white/20">
                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar tutoriais por nome ou categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12"
                    data-testid="input-search-tutorials"
                  />
                </div>

                {/* Selected Count */}
                {selectedTutorials.length > 0 && (
                  <div className="mb-6">
                    <span className="px-4 py-2 bg-nextest-green text-white rounded-full text-sm font-medium">
                      <Check className="inline h-4 w-4 mr-2" />
                      {selectedTutorials.length} tutorial{selectedTutorials.length !== 1 ? 'ais' : ''} selecionado{selectedTutorials.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Tutorials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTutorials.map((tutorial) => (
                    <div
                      key={tutorial.id}
                      className={`tutorial-card relative bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:border-nextest-blue hover:-translate-y-1 hover:shadow-lg ${
                        selectedTutorials.includes(tutorial.id) ? 'selected' : ''
                      }`}
                      onClick={() => toggleTutorial(tutorial.id)}
                      data-testid={`card-tutorial-${tutorial.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-nextest-dark text-sm">{tutorial.name}</h4>
                        <div className={`tutorial-status w-5 h-5 border-2 rounded flex items-center justify-center ${
                          selectedTutorials.includes(tutorial.id) 
                            ? 'bg-nextest-green border-nextest-green' 
                            : 'border-gray-200'
                        }`}>
                          {selectedTutorials.includes(tutorial.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 text-xs mb-3 line-clamp-2">{tutorial.description}</p>
                      <span className="px-2 py-1 bg-nextest-blue/10 text-nextest-blue text-xs rounded-full">
                        {tutorial.category}
                      </span>
                    </div>
                  ))}
                </div>

                {filteredTutorials.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum tutorial encontrado</p>
                  </div>
                )}
              </div>

              {form.formState.errors.tutorialIds && (
                <p className="text-sm text-red-500 mt-2">{form.formState.errors.tutorialIds.message}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-release"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createReleaseMutation.isPending}
                className="gradient-button text-white hover:scale-[1.02] transition-all duration-300"
                data-testid="button-submit-release"
              >
                <NotebookPen className="h-4 w-4 mr-2" />
                {createReleaseMutation.isPending ? "Liberando..." : "Liberar Tutoriais"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
