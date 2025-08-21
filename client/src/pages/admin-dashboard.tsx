import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Car, 
  DollarSign, 
  TrendingUp,
  MapPin,
  Clock,
  Phone,
  Shield,
  Settings,
  Download,
  LogOut,
  Eye,
  EyeOff
} from "lucide-react";
import type { RideWithDetails, UserWithDriver } from "@shared/schema";

interface SystemStats {
  totalUsers: number;
  totalDrivers: number;
  totalRides: number;
  activeSubscriptions: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth");
    } else if (user?.role !== "admin") {
      setLocation("/");
    }
  }, [isAuthenticated, user, setLocation]);

  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin-secret-2024/stats"],
    enabled: !!user && user.role === "admin",
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery<UserWithDriver[]>({
    queryKey: ["/api/admin-secret-2024/users"],
    enabled: !!user && user.role === "admin",
  });

  // Fetch all rides
  const { data: rides, isLoading: ridesLoading } = useQuery<RideWithDetails[]>({
    queryKey: ["/api/admin-secret-2024/rides"],
    enabled: !!user && user.role === "admin",
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user || user.role !== "admin") {
    return <div>Acesso negado</div>;
  }

  const formatPrice = (priceInCents: number) => {
    return `${(priceInCents / 100).toFixed(0)} CVE`;
  };

  const formatDateTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString('pt-CV');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", text: "Aguardando" },
      accepted: { color: "bg-blue-500", text: "Aceita" },
      started: { color: "bg-green-500", text: "Em andamento" },
      completed: { color: "bg-gray-500", text: "Concluída" },
      cancelled: { color: "bg-red-500", text: "Cancelada" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const getUserRoleBadge = (role: string) => {
    const roleConfig = {
      passenger: { color: "bg-blue-500", text: "Passageiro" },
      driver: { color: "bg-green-500", text: "Motorista" },
      admin: { color: "bg-purple-500", text: "Admin" },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.passenger;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const getSubscriptionBadge = (status?: string) => {
    if (!status) return null;
    
    const statusConfig = {
      trial: { color: "bg-green-500", text: "Teste" },
      active: { color: "bg-blue-500", text: "Ativa" },
      expired: { color: "bg-red-500", text: "Expirada" },
      cancelled: { color: "bg-gray-500", text: "Cancelada" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  // Calculate some additional metrics
  const todayRides = rides?.filter(ride => 
    new Date(ride.requestedAt).toDateString() === new Date().toDateString()
  ) || [];

  const totalRevenue = rides?.reduce((total, ride) => 
    ride.status === 'completed' ? total + (ride.finalPrice || ride.estimatedPrice) : total, 0
  ) || 0;

  const completionRate = rides?.length ? 
    (rides.filter(ride => ride.status === 'completed').length / rides.length * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-coastal-mist dark:bg-deep-ocean">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-semibold flex items-center" data-testid="text-admin-title">
            <Shield className="mr-2 h-6 w-6" />
            Painel Administrativo
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm" data-testid="text-admin-name">{user.name}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="border-white text-white hover:bg-white hover:text-purple-600"
              data-testid="button-admin-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total de Usuários</p>
                  <p className="text-2xl font-bold text-ocean-blue" data-testid="text-total-users">
                    {statsLoading ? "..." : stats?.totalUsers || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-ocean-blue" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Motoristas</p>
                  <p className="text-2xl font-bold text-green-500" data-testid="text-total-drivers">
                    {statsLoading ? "..." : stats?.totalDrivers || 0}
                  </p>
                </div>
                <Car className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total de Corridas</p>
                  <p className="text-2xl font-bold text-purple-500" data-testid="text-total-rides">
                    {statsLoading ? "..." : stats?.totalRides || 0}
                  </p>
                </div>
                <MapPin className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Assinaturas Ativas</p>
                  <p className="text-2xl font-bold text-sun-yellow" data-testid="text-active-subscriptions">
                    {statsLoading ? "..." : stats?.activeSubscriptions || 0}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-sun-yellow" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Corridas Hoje</p>
                  <p className="text-2xl font-bold text-ocean-blue" data-testid="text-today-rides">
                    {todayRides.length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-ocean-blue" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Receita Total</p>
                  <p className="text-2xl font-bold text-green-500" data-testid="text-total-revenue">
                    {formatPrice(totalRevenue)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Conclusão</p>
                  <p className="text-2xl font-bold text-purple-500" data-testid="text-completion-rate">
                    {completionRate}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" data-testid="tab-users">Usuários</TabsTrigger>
            <TabsTrigger value="rides" data-testid="tab-rides">Corridas</TabsTrigger>
            <TabsTrigger value="drivers" data-testid="tab-drivers">Motoristas</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Configurações</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle data-testid="text-users-management-title">Gestão de Usuários</CardTitle>
                  <Button variant="outline" size="sm" data-testid="button-export-users">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <p>Carregando usuários...</p>
                ) : users && users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        data-testid={`card-user-${user.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-gray-800 dark:text-white">
                                {user.name}
                              </h3>
                              {getUserRoleBadge(user.role)}
                              {user.driver && user.subscription && 
                                getSubscriptionBadge(user.subscription.status)
                              }
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                              <p>Email: {user.email}</p>
                              <p>Telefone: {user.phone || "Não informado"}</p>
                              {user.driver && (
                                <>
                                  <p>Placa: {user.driver.licensePlate}</p>
                                  <p>Avaliação: ⭐ {user.driver.rating?.toFixed(1)}</p>
                                  <p>Total de corridas: {user.driver.totalRides}</p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              Criado em: {formatDateTime(user.createdAt!)}
                            </p>
                            <div className="flex space-x-2 mt-2">
                              <Button variant="outline" size="sm" data-testid={`button-view-user-${user.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" data-testid={`button-edit-user-${user.id}`}>
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum usuário encontrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rides Tab */}
          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle data-testid="text-rides-management-title">Gestão de Corridas</CardTitle>
                  <Button variant="outline" size="sm" data-testid="button-export-rides">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ridesLoading ? (
                  <p>Carregando corridas...</p>
                ) : rides && rides.length > 0 ? (
                  <div className="space-y-4">
                    {rides.slice(0, 20).map((ride) => (
                      <div
                        key={ride.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        data-testid={`card-ride-${ride.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="font-medium text-gray-800 dark:text-white">
                                <MapPin className="inline w-4 h-4 text-green-500 mr-1" />
                                {ride.origin} → {ride.destination}
                              </div>
                              {getStatusBadge(ride.status)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                              <p>Passageiro: {ride.passenger?.name}</p>
                              <p>Telefone: {ride.passengerPhone}</p>
                              {ride.driver && (
                                <p>Motorista: {ride.driver.user?.name} ({ride.driver.licensePlate})</p>
                              )}
                              <p>Solicitada em: {formatDateTime(ride.requestedAt)}</p>
                              {ride.notes && <p>Observações: {ride.notes}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-500 mb-2">
                              {formatPrice(ride.finalPrice || ride.estimatedPrice)}
                            </div>
                            <Button variant="outline" size="sm" data-testid={`button-view-ride-${ride.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhuma corrida encontrada</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-drivers-management-title">Gestão de Motoristas</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <p>Carregando motoristas...</p>
                ) : users ? (
                  <div className="space-y-4">
                    {users.filter(user => user.role === 'driver').map((driver) => (
                      <div
                        key={driver.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        data-testid={`card-driver-${driver.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-gray-800 dark:text-white">
                                {driver.name}
                              </h3>
                              {driver.driver?.isVerified ? (
                                <Badge className="bg-green-500 text-white">Verificado</Badge>
                              ) : (
                                <Badge className="bg-yellow-500 text-white">Pendente</Badge>
                              )}
                              {driver.subscription && 
                                getSubscriptionBadge(driver.subscription.status)
                              }
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                              <p>Email: {driver.email}</p>
                              <p>Telefone: {driver.phone}</p>
                              <p>Placa: {driver.driver?.licensePlate}</p>
                              <p>Modelo: {driver.driver?.vehicleModel || "Não informado"}</p>
                              <p>Avaliação: ⭐ {driver.driver?.rating?.toFixed(1)}</p>
                              <p>Total de corridas: {driver.driver?.totalRides}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex flex-col space-y-2">
                              <Button variant="outline" size="sm" data-testid={`button-verify-driver-${driver.id}`}>
                                {driver.driver?.isVerified ? "Reverificar" : "Verificar"}
                              </Button>
                              <Button variant="outline" size="sm" data-testid={`button-manage-subscription-${driver.id}`}>
                                Assinatura
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum motorista encontrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-system-settings-title">Configurações do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Configurações de Preços</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <h4 className="font-medium mb-2">Tarifa Base</h4>
                        <p className="text-2xl font-bold text-ocean-blue">100 CVE</p>
                      </div>
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <h4 className="font-medium mb-2">Por Km</h4>
                        <p className="text-2xl font-bold text-ocean-blue">80 CVE</p>
                      </div>
                    </div>
                    <Button className="mt-4" data-testid="button-edit-pricing">
                      <Settings className="mr-2 h-4 w-4" />
                      Editar Preços
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Mensalidade de Motoristas</h3>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <h4 className="font-medium mb-2">Valor Mensal</h4>
                      <p className="text-2xl font-bold text-green-500">1.500 CVE</p>
                    </div>
                    <Button className="mt-4" data-testid="button-edit-subscription-fee">
                      <Settings className="mr-2 h-4 w-4" />
                      Editar Mensalidade
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Ações do Sistema</h3>
                    <div className="flex flex-wrap gap-4">
                      <Button variant="outline" data-testid="button-backup-database">
                        <Download className="mr-2 h-4 w-4" />
                        Backup do Banco
                      </Button>
                      <Button variant="outline" data-testid="button-clear-logs">
                        <Settings className="mr-2 h-4 w-4" />
                        Limpar Logs
                      </Button>
                      <Button variant="outline" data-testid="button-system-stats">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Relatórios
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
