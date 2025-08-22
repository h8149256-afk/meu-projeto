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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  EyeOff,
  UserCheck,
  UserX,
  Ban,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  Search,
  Filter,
  Plus,
  Edit
} from "lucide-react";
import type { RideWithDetails, UserWithDriver } from "@shared/schema";

interface SystemStats {
  totalUsers: number;
  totalDrivers: number;
  totalRides: number;
  activeSubscriptions: number;
  todayRides: number;
  totalRevenue: number;
  completionRate: number;
}

export default function AdminDashboardEnhanced() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [rideFilter, setRideFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithDriver | null>(null);

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth");
    } else if (user?.role !== "admin") {
      setLocation("/");
    }
  }, [isAuthenticated, user, setLocation]);

  // Enhanced stats calculation
  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin-secret-2024/stats"],
    enabled: !!user && user.role === "admin",
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserWithDriver[]>({
    queryKey: ["/api/admin-secret-2024/users"],
    enabled: !!user && user.role === "admin",
  });

  const { data: rides, isLoading: ridesLoading } = useQuery<RideWithDetails[]>({
    queryKey: ["/api/admin-secret-2024/rides"],
    enabled: !!user && user.role === "admin",
  });

  // User management mutations
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'activate' | 'deactivate' }) => {
      const response = await apiRequest("PATCH", `/api/admin-secret-2024/users/${userId}/${action}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-secret-2024/users"] });
      toast({ title: "Status do usuário atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  });

  const verifyDriverMutation = useMutation({
    mutationFn: async ({ driverId, verified }: { driverId: string; verified: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin-secret-2024/drivers/${driverId}/verify`, { verified });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-secret-2024/users"] });
      toast({ title: "Status de verificação atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro ao verificar motorista", variant: "destructive" });
    }
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user || user.role !== "admin") {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
        <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        <Button onClick={() => setLocation("/")} className="mt-4">Voltar ao Início</Button>
      </div>
    </div>;
  }

  const formatPrice = (priceInCents: number) => {
    return `${(priceInCents / 100).toFixed(0)} CVE`;
  };

  const formatDateTime = (timestamp: Date | null) => {
    if (!timestamp) return 'N/A';
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

  // Filter functions
  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = userFilter === "all" || user.role === userFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredRides = rides?.filter(ride => {
    const matchesSearch = ride.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ride.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ride.passenger?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = rideFilter === "all" || ride.status === rideFilter;
    return matchesSearch && matchesFilter;
  });

  // Enhanced metrics
  const todayRides = rides?.filter(ride => 
    ride.requestedAt ? new Date(ride.requestedAt).toDateString() === new Date().toDateString() : false
  ) || [];

  const thisWeekRides = rides?.filter(ride => {
    if (!ride.requestedAt) return false;
    const rideDate = new Date(ride.requestedAt);
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return rideDate >= weekAgo && rideDate <= today;
  }) || [];

  const totalRevenue = rides?.reduce((total, ride) => 
    ride.status === 'completed' ? total + (ride.finalPrice || ride.estimatedPrice) : total, 0
  ) || 0;

  const completionRate = rides?.length ? 
    (rides.filter(ride => ride.status === 'completed').length / rides.length * 100) : 0;

  const averageRideValue = rides?.filter(r => r.status === 'completed').length ? 
    totalRevenue / rides.filter(r => r.status === 'completed').length : 0;

  return (
    <div className="min-h-screen bg-coastal-mist dark:bg-deep-ocean">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Painel Administrativo</h1>
              <p className="text-purple-200 text-sm">Sistema de Gestão MindeloRide</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-purple-200">Logado como</div>
              <div className="font-semibold">{user.name}</div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Usuários Totais</span>
                <Users className="h-6 w-6" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-blue-100 text-sm">Passageiros e motoristas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Corridas Hoje</span>
                <Calendar className="h-6 w-6" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{todayRides.length}</div>
              <p className="text-green-100 text-sm">Esta semana: {thisWeekRides.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Receita Total</span>
                <DollarSign className="h-6 w-6" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatPrice(totalRevenue)}</div>
              <p className="text-yellow-100 text-sm">Ticket médio: {formatPrice(averageRideValue)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Taxa Conclusão</span>
                <TrendingUp className="h-6 w-6" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completionRate.toFixed(1)}%</div>
              <p className="text-purple-100 text-sm">Corridas completadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Management Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-800">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="rides">Corridas</TabsTrigger>
            <TabsTrigger value="drivers">Motoristas</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rides?.slice(0, 5).map((ride) => (
                      <div key={ride.id} className="flex items-center justify-between py-2 border-b">
                        <div>
                          <div className="font-medium">{ride.origin} → {ride.destination}</div>
                          <div className="text-sm text-gray-500">{ride.passenger?.name}</div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(ride.status)}
                          <div className="text-sm text-gray-500 mt-1">{formatPrice(ride.estimatedPrice)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alertas do Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {users?.filter(u => u.role === 'driver' && !u.driver?.isVerified).slice(0, 3).map((driver) => (
                      <div key={driver.id} className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <div className="flex-1">
                          <div className="font-medium">Motorista aguardando verificação</div>
                          <div className="text-sm text-gray-500">{driver.name} - {driver.driver?.licensePlate}</div>
                        </div>
                        <Button size="sm" onClick={() => verifyDriverMutation.mutate({ driverId: driver.driver!.id, verified: true })}>
                          Verificar
                        </Button>
                      </div>
                    ))}
                    {todayRides.filter(r => r.status === 'pending').length > 0 && (
                      <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">{todayRides.filter(r => r.status === 'pending').length} corridas aguardando</div>
                          <div className="text-sm text-gray-500">Corridas pendentes hoje</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gestão de Usuários</CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Buscar usuários..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="passenger">Passageiros</SelectItem>
                        <SelectItem value="driver">Motoristas</SelectItem>
                        <SelectItem value="admin">Administradores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers?.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={user.role === 'admin' ? 'default' : user.role === 'driver' ? 'secondary' : 'outline'}>
                                {user.role === 'admin' ? 'Admin' : user.role === 'driver' ? 'Motorista' : 'Passageiro'}
                              </Badge>
                              {user.driver && (
                                <Badge variant={user.driver.isVerified ? 'default' : 'destructive'}>
                                  {user.driver.isVerified ? 'Verificado' : 'Não Verificado'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {user.role === 'driver' && user.driver && (
                            <Button
                              size="sm"
                              variant={user.driver.isVerified ? "outline" : "default"}
                              onClick={() => verifyDriverMutation.mutate({ 
                                driverId: user.driver!.id, 
                                verified: !user.driver!.isVerified 
                              })}
                            >
                              {user.driver.isVerified ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Usuário</DialogTitle>
                              </DialogHeader>
                              {selectedUser && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="font-medium">Nome:</label>
                                      <p>{selectedUser.name}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Email:</label>
                                      <p>{selectedUser.email}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Telefone:</label>
                                      <p>{selectedUser.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Tipo:</label>
                                      <p className="capitalize">{selectedUser.role}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium">Cadastrado em:</label>
                                      <p>{formatDateTime(selectedUser.createdAt)}</p>
                                    </div>
                                  </div>
                                  {selectedUser.driver && (
                                    <div className="border-t pt-4">
                                      <h4 className="font-medium mb-2">Informações do Motorista</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="font-medium">Placa:</label>
                                          <p>{selectedUser.driver.licensePlate}</p>
                                        </div>
                                        <div>
                                          <label className="font-medium">Veículo:</label>
                                          <p>{selectedUser.driver.vehicleModel || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <label className="font-medium">Avaliação:</label>
                                          <p>{selectedUser.driver.rating ? `${selectedUser.driver.rating.toFixed(1)} ⭐` : 'N/A'}</p>
                                        </div>
                                        <div>
                                          <label className="font-medium">Total de Corridas:</label>
                                          <p>{selectedUser.driver.totalRides}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Rides Tab */}
          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gestão de Corridas</CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Buscar corridas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    <Select value={rideFilter} onValueChange={setRideFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="pending">Aguardando</SelectItem>
                        <SelectItem value="accepted">Aceitas</SelectItem>
                        <SelectItem value="started">Em andamento</SelectItem>
                        <SelectItem value="completed">Concluídas</SelectItem>
                        <SelectItem value="cancelled">Canceladas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredRides?.slice(0, 20).map((ride) => (
                    <div key={ride.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="font-medium">
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
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Estatísticas Detalhadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total de Usuários:</span>
                      <span className="font-bold">{users?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passageiros:</span>
                      <span className="font-bold">{users?.filter(u => u.role === 'passenger').length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Motoristas:</span>
                      <span className="font-bold">{users?.filter(u => u.role === 'driver').length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Motoristas Verificados:</span>
                      <span className="font-bold">{users?.filter(u => u.role === 'driver' && u.driver?.isVerified).length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total de Corridas:</span>
                      <span className="font-bold">{rides?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Corridas Completadas:</span>
                      <span className="font-bold">{rides?.filter(r => r.status === 'completed').length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de Conclusão:</span>
                      <span className="font-bold">{completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receita Total:</span>
                      <span className="font-bold text-green-600">{formatPrice(totalRevenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Relatório de Usuários
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Relatório de Corridas
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações do Sistema
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Usuário Admin
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}