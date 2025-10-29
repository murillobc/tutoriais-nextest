import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, User, Building, ArrowLeft, Key, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Email inválido").refine(
    email => email.endsWith('@nextest.com.br'),
    "Email deve ser do domínio @nextest.com.br"
  ),
  password: z.string().optional(),
  loginMethod: z.enum(["password", "code"]).default("code")
});

const verifySchema = z.object({
  code: z.string().length(6, "Código deve ter 6 dígitos")
});

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").refine(
    email => email.endsWith('@nextest.com.br'),
    "Email deve ser do domínio @nextest.com.br"
  ),
  department: z.string().min(1, "Departamento é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  confirmPassword: z.string().optional()
}).refine(data => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, { message: "Senhas não coincidem", path: ["confirmPassword"] });

type LoginForm = z.infer<typeof loginSchema>;
type VerifyForm = z.infer<typeof verifySchema>;
type RegisterForm = z.infer<typeof registerSchema>;

type Screen = 'login' | 'verification' | 'register';
type LoginMethod = 'password' | 'code';

export default function Login() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [userEmail, setUserEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('code');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login, verify, register } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { 
      email: '',
      password: '',
      loginMethod: 'code'
    }
  });

  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' }
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      name: '', 
      email: '', 
      department: '', 
      password: '',
      confirmPassword: ''
    }
  });

  const onLogin = async (data: LoginForm) => {
    try {
      const response = await login({
        email: data.email,
        password: data.password,
        loginMethod: data.loginMethod || loginMethod
      });
      
      if (data.loginMethod === 'password' && response.user) {
        // Direct login with password
        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao Portal de Tutoriais."
        });
      } else {
        // Code verification needed
        setUserEmail(data.email);
        setCurrentScreen('verification');
        toast({
          title: "Código enviado!",
          description: response.debugCode ? 
            `Código: ${response.debugCode} (problema com email)` : 
            "Verifique seu email para o código de verificação."
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const onVerify = async (data: VerifyForm) => {
    try {
      await verify(userEmail, data.code);
      toast({
        title: "Login realizado!",
        description: "Bem-vindo ao Portal de Tutoriais."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const onRegister = async (data: RegisterForm) => {
    try {
      await register({
        name: data.name,
        email: data.email,
        department: data.department,
        password: data.password,
        confirmPassword: data.confirmPassword
      });
      toast({
        title: "Conta criada!",
        description: data.password ? 
          "Agora você pode fazer login com senha." :
          "Agora você pode fazer login."
      });
      setCurrentScreen('login');
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const LoginScreen = () => (
    <div className="glass-effect rounded-3xl shadow-2xl p-8 w-full max-w-md animate-slide-up">
      <div className="text-center mb-8">
        <img 
          src="https://educanextest.com.br/lovable-uploads/bb450ec0-408d-48fd-8658-aaa1bbbfec7d.png" 
          alt="Educa Nextest Logo" 
          className="w-48 mx-auto mb-6 drop-shadow-sm"
        />
        <h1 className="text-2xl font-semibold text-nextest-dark mb-2">Portal de Tutoriais</h1>
        <p className="text-gray-600 text-sm">Faça login para acessar o sistema de liberação</p>
      </div>

      {/* Login Method Toggle */}
      <div className="mb-6">
        <Label className="text-sm font-medium text-gray-700 mb-3 block">Como deseja fazer login?</Label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('code');
              loginForm.setValue('loginMethod', 'code');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              loginMethod === 'code' 
                ? 'bg-white text-nextest-blue shadow-sm' 
                : 'text-gray-600 hover:text-nextest-blue'
            }`}
            data-testid="button-login-code"
          >
            <Mail className="inline w-4 h-4 mr-2" />
            Código por Email
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('password');
              loginForm.setValue('loginMethod', 'password');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              loginMethod === 'password' 
                ? 'bg-white text-nextest-blue shadow-sm' 
                : 'text-gray-600 hover:text-nextest-blue'
            }`}
            data-testid="button-login-password"
          >
            <Key className="inline w-4 h-4 mr-2" />
            Senha
          </button>
        </div>
      </div>

      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email Corporativo</Label>
          <Input
            id="email"
            type="email"
            placeholder="seuemail@nextest.com.br"
            {...loginForm.register("email")}
            data-testid="input-email"
          />
          {loginForm.formState.errors.email && (
            <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
          )}
        </div>

        {loginMethod === 'password' && (
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                {...loginForm.register("password")}
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginForm.formState.errors.password && (
              <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
            )}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full gradient-button text-white hover:scale-[1.02] transition-all duration-300"
          data-testid="button-login"
        >
          {loginMethod === 'password' ? (
            <>
              <Key className="mr-2 h-4 w-4" />
              Entrar com Senha
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Enviar Código de Acesso
            </>
          )}
        </Button>
      </form>

      <div className="text-center mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-3">Não possui conta?</p>
        <Button 
          variant="ghost"
          onClick={() => setCurrentScreen('register')}
          data-testid="button-show-register"
        >
          Criar Conta Corporativa
        </Button>
      </div>
    </div>
  );

  const VerificationScreen = () => (
    <div className="glass-effect rounded-3xl shadow-2xl p-8 w-full max-w-md animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-nextest-green rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="text-white h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold text-nextest-dark mb-2">Código Enviado</h2>
        <p className="text-gray-600 text-sm">Verifique seu email e digite o código de 6 dígitos</p>
        <p className="text-nextest-blue text-sm font-medium mt-1">{userEmail}</p>
      </div>

      <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="code">Código de Verificação</Label>
          <Input
            id="code"
            placeholder="000000"
            maxLength={6}
            className="text-center text-2xl font-mono tracking-wider"
            {...verifyForm.register("code")}
            data-testid="input-verification-code"
          />
          {verifyForm.formState.errors.code && (
            <p className="text-sm text-red-500">{verifyForm.formState.errors.code.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full gradient-button text-white hover:scale-[1.02] transition-all duration-300"
          data-testid="button-verify"
        >
          Verificar Código
        </Button>
      </form>

      <div className="text-center mt-6">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentScreen('login')}
          data-testid="button-back-to-login"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao login
        </Button>
      </div>
    </div>
  );

  const RegisterScreen = () => (
    <div className="glass-effect rounded-3xl shadow-2xl p-8 w-full max-w-md animate-slide-up">
      <div className="text-center mb-8">
        <img 
          src="https://educanextest.com.br/wp-content/uploads/2024/04/Group-13Logo-Horizontal-Educa-SVG-Fix.svg" 
          alt="Educa Nextest Logo" 
          className="w-48 mx-auto mb-6 drop-shadow-sm"
        />
        <h2 className="text-2xl font-semibold text-nextest-dark mb-2">Criar Conta</h2>
        <p className="text-gray-600 text-sm">Apenas emails @nextest.com.br são permitidos</p>
      </div>

      <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input
            id="name"
            placeholder="Seu nome completo"
            {...registerForm.register("name")}
            data-testid="input-register-name"
          />
          {registerForm.formState.errors.name && (
            <p className="text-sm text-red-500">{registerForm.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerEmail">Email Corporativo</Label>
          <Input
            id="registerEmail"
            type="email"
            placeholder="seuemail@nextest.com.br"
            {...registerForm.register("email")}
            data-testid="input-register-email"
          />
          {registerForm.formState.errors.email && (
            <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Select onValueChange={(value) => registerForm.setValue("department", value)}>
            <SelectTrigger data-testid="select-department">
              <SelectValue placeholder="Selecione o departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="engineering">Engenharia</SelectItem>
              <SelectItem value="sales">Vendas</SelectItem>
              <SelectItem value="support">Suporte</SelectItem>
              <SelectItem value="management">Gerência</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
          {registerForm.formState.errors.department && (
            <p className="text-sm text-red-500">{registerForm.formState.errors.department.message}</p>
          )}
        </div>

        {/* Password Fields (Optional) */}
        <div className="space-y-4 pt-2 border-t border-gray-200">
          <div className="text-center">
            <Label className="text-sm text-gray-600">Senha (Opcional)</Label>
            <p className="text-xs text-gray-500 mt-1">Se não definir senha, usará código por email</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="registerPassword">Senha</Label>
            <div className="relative">
              <Input
                id="registerPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres (opcional)"
                {...registerForm.register("password")}
                data-testid="input-register-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                data-testid="button-toggle-register-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {registerForm.formState.errors.password && (
              <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repita a senha"
                {...registerForm.register("confirmPassword")}
                data-testid="input-confirm-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                data-testid="button-toggle-confirm-password"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {registerForm.formState.errors.confirmPassword && (
              <p className="text-sm text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full gradient-button text-white hover:scale-[1.02] transition-all duration-300"
          data-testid="button-register"
        >
          <User className="mr-2 h-4 w-4" />
          Criar Conta
        </Button>
      </form>

      <div className="text-center mt-6">
        <Button 
          variant="ghost"
          onClick={() => setCurrentScreen('login')}
          data-testid="button-back-to-login-from-register"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao login
        </Button>
      </div>
    </div>
  );

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center p-4">
      {currentScreen === 'login' && <LoginScreen />}
      {currentScreen === 'verification' && <VerificationScreen />}
      {currentScreen === 'register' && <RegisterScreen />}
    </div>
  );
}
