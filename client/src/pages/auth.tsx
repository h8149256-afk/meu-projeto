import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Car, User } from "lucide-react";
import { loginSchema, registerSchema, type LoginData, type RegisterData } from "@shared/schema";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  // Get URL params for mode
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      phone: "",
      role: mode === 'driver' ? 'driver' : 'passenger',
      licensePlate: "",
      vehicleModel: "",
    },
  });

  const handleLogin = async (data: LoginData) => {
    try {
      const result = await login(data);
      
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao MindeloRide.",
      });

      // Redirect based on user role - get user data from auth context
      setTimeout(() => {
        // The user data will be available in the auth context
        // Use proper routing instead of window.location
        setLocation('/');
      }, 1000);
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos.",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (data: RegisterData) => {
    try {
      // Validate driver-specific fields
      if (data.role === 'driver' && !data.licensePlate?.trim()) {
        toast({
          title: "Erro no cadastro",
          description: "Placa do veículo é obrigatória para motoristas.",
          variant: "destructive",
        });
        return;
      }

      const result = await register(data);
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: data.role === 'driver' 
          ? "Seu primeiro mês é grátis! Bem-vindo à equipe de motoristas."
          : "Bem-vindo ao MindeloRide! Agora você pode solicitar corridas.",
      });

      // Redirect to appropriate dashboard
      setTimeout(() => {
        if (data.role === "driver") {
          setLocation("/driver");
        } else if (data.role === "admin") {
          setLocation("/admin-secret-2024");
        } else {
          setLocation("/passenger");
        }
      }, 1000);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Erro no cadastro",
        description: error.message || "Erro ao criar conta. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-coastal-mist to-blue-50 dark:from-deep-ocean dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-blue-600 rounded-lg flex items-center justify-center">
                <Car className="text-white h-5 w-5" />
              </div>
              <span className="font-bold text-lg">MindeloRide</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2 text-center">
                <CardTitle>Entrar na sua conta</CardTitle>
                <CardDescription>Digite seu email e senha para acessar</CardDescription>
              </div>

              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    data-testid="input-login-email"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive" data-testid="error-login-email">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    data-testid="input-login-password"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive" data-testid="error-login-password">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-ocean-blue hover:bg-blue-600" 
                  disabled={isLoading}
                  data-testid="button-login-submit"
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="space-y-2 text-center">
                <CardTitle>Criar conta</CardTitle>
                <CardDescription>
                  {mode === 'driver' ? 'Cadastre-se como motorista' : 'Cadastre-se como passageiro'}
                </CardDescription>
              </div>

              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    data-testid="input-register-name"
                    {...registerForm.register("name")}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    data-testid="input-register-email"
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+238 xxx xxxx"
                    data-testid="input-register-phone"
                    {...registerForm.register("phone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de conta</Label>
                  <Select 
                    value={registerForm.watch("role")} 
                    onValueChange={(value: "passenger" | "driver") => 
                      registerForm.setValue("role", value)
                    }
                  >
                    <SelectTrigger data-testid="select-register-role">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passenger">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Passageiro
                        </div>
                      </SelectItem>
                      <SelectItem value="driver">
                        <div className="flex items-center">
                          <Car className="w-4 h-4 mr-2" />
                          Motorista
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {registerForm.watch("role") === "driver" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="licensePlate">Placa do veículo</Label>
                      <Input
                        id="licensePlate"
                        placeholder="ABC-1234"
                        data-testid="input-register-license-plate"
                        {...registerForm.register("licensePlate")}
                      />
                      {registerForm.formState.errors.licensePlate && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.licensePlate.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicleModel">Modelo do veículo (opcional)</Label>
                      <Input
                        id="vehicleModel"
                        placeholder="Ex: Toyota Corolla 2015"
                        data-testid="input-register-vehicle-model"
                        {...registerForm.register("vehicleModel")}
                      />
                    </div>

                    <div className="p-3 bg-sun-yellow/20 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Primeiro mês grátis!</strong> Depois apenas 1.500 CVE/mês.
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    data-testid="input-register-password"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    data-testid="input-register-confirm-password"
                    {...registerForm.register("confirmPassword")}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-ocean-blue hover:bg-blue-600" 
                  disabled={isLoading}
                  data-testid="button-register-submit"
                >
                  {isLoading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
