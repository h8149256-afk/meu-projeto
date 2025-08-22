import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DriverRideCard from "@/components/driver-ride-card";
import { 
  Home, 
  History, 
  Wallet, 
  User, 
  Car,
  CheckCircle,
  XCircle,
  Play,
  Square,
  Clock,
  DollarSign,
  Star,
  LogOut,
  AlertTriangle
} from "lucide-react";
import type { RideWithDetails } from "@shared/schema";

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const websocket = useWebSocket();
  const [activeTab, setActiveTab] = useState("home");
  const [isOnline, setIsOnline] = useState(true);

  // Redirect if not authenticated or not a driver
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth");
    } else if (user?.role !== "driver") {
      setLocation("/");
    }
  }, [isAuthenticated, user, setLocation]);

  // WebSocket event listeners
  useEffect(() => {
    const handleNewRide = (data: any) => {
      toast({
        title: "Nova corrida disponível!",
        description: `${data.ride.origin} → ${data.ride.destination}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/pending"] });
    };

    websocket.on('new_ride', handleNewRide);

    return () => {
      websocket.off('new_ride', handleNewRide);
    };
  }, [websocket, toast, queryClient]);

  // Fetch pending rides
  const { data: pendingRides, isLoading: pendingLoading } = useQuery<RideWithDetails[]>({
    queryKey: ["/api/rides/pending"],
    enabled: !!user?.driver && isOnline,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch driver's rides
  const { data: driverRides, isLoading: ridesLoading } = useQuery<RideWithDetails[]>({
    queryKey: ["/api/rides"],
    enabled: !!user?.driver,
  });

  // Accept ride mutation
  const acceptRideMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("PATCH", `/api/rides/${rideId}/accept`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Corrida aceita!",
        description: "Entre em contato com o passageiro.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aceitar corrida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start ride mutation
  const startRideMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest("PATCH", `/api/rides/${rideId}/start`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Corrida iniciada!",
        description: "Boa viagem!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
    },
  });

  // Complete ride mutation
  const completeRideMutation = useMutation({
    mutationFn: async ({ rideId, finalPrice, distance }: { rideId: string; finalPrice?: number; distance?: number }) => {
      const response = await apiRequest("PATCH", `/api/rides/${rideId}/complete`, {
        finalPrice,
        distance,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Corrida finalizada!",
        description: "Pagamento registrado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user || !user.driver) {
    return <div>Carregando...</div>;
  }

  const subscription = user.subscription;
  const isSubscriptionExpired = subscription?.status === 'expired';
  const isTrialActive = subscription?.status === 'trial';
  
  const getSubscriptionStatus = () => {
    if (!subscription) return { text: "Sem assinatura", color: "bg-red-500" };
    
    switch (subscription.status) {
      case 'trial':
        const daysLeft = subscription.trialEndsAt ? 
          Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
        return { 
          text: `Teste - ${daysLeft} dias restantes`, 
          color: "bg-green-500" 
        };
      case 'active':
        return { text: "Ativa", color: "bg-green-500" };
      case 'expired':
        return { text: "Expirada", color: "bg-red-500" };
      case 'cancelled':
        return { text: "Cancelada", color: "bg-gray-500" };
      default:
        return { text: "Desconhecido", color: "bg-gray-500" };
    }
  };

  const formatPrice = (priceInCents: number) => {
    return `${(priceInCents / 100).toFixed(0)} CVE`;
  };

  const formatDateTime = (timestamp: Date | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('pt-CV');
  };

  const activeRide = driverRides?.find(ride => ride.status === 'accepted' || ride.status === 'started');
  const completedRidesToday = driverRides?.filter(ride => 
    ride.status === 'completed' && 
    new Date(ride.completedAt!).toDateString() === new Date().toDateString()
  ) || [];

  const todayEarnings = completedRidesToday.reduce((total, ride) => 
    total + (ride.finalPrice || ride.estimatedPrice), 0
  );

  const subscriptionStatusInfo = getSubscriptionStatus();

  return (
    <div className="min-h-screen bg-coastal-mist dark:bg-deep-ocean">
      {/* Header */}
      <div className="bg-gradient-to-r from-sun-yellow to-yellow-400 text-gray-800 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-semibold" data-testid="text-driver-title">
            {activeTab === "home" && "Área do Motorista"}
            {activeTab === "history" && "Histórico"}
            {activeTab === "wallet" && "Carteira"}
            {activeTab === "profile" && "Perfil"}
          </h1>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium" data-testid="text-online-status">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
        {/* Subscription Warning */}
        {isSubscriptionExpired && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Assinatura Expirada</p>
                  <p className="text-sm">Renove sua assinatura para aceitar corridas.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Home Tab */}
        {activeTab === "home" && (
          <>
            {/* Subscription Status */}
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Plano Ativo</h3>
                  <Badge className={`${subscriptionStatusInfo.color} text-white`}>
                    {isTrialActive ? 'GRÁTIS' : 'PAGO'}
                  </Badge>
                </div>
                <div className="text-sm opacity-90 mb-2" data-testid="text-subscription-status">
                  {subscriptionStatusInfo.text}
                </div>
                {!isSubscriptionExpired && (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-next-payment">
                      {isTrialActive ? 'Próximo pagamento: 1.500 CVE' : 'Mensalidade: 1.500 CVE'}
                    </div>
                    <div className="text-sm opacity-90">
                      {subscription?.currentPeriodEnd ? 
                        new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-CV') : 
                        'Data não definida'
                      }
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Active Ride */}
            {activeRide && (
              <Card className="bg-ocean-blue text-white">
                <CardHeader>
                  <CardTitle className="flex items-center" data-testid="text-active-ride-title">
                    <Car className="mr-2 h-5 w-5" />
                    Corrida Ativa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/20 rounded-xl p-4 mb-4">
                    <div className="font-medium mb-2" data-testid="text-active-ride-route">
                      {activeRide.origin} → {activeRide.destination}
                    </div>
                    <div className="text-sm opacity-90 mb-2" data-testid="text-active-ride-passenger">
                      Passageiro: {activeRide.passenger?.name}
                    </div>
                    <div className="text-sm opacity-90" data-testid="text-active-ride-phone">
                      Telefone: {activeRide.passengerPhone}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {activeRide.status === 'accepted' && (
                      <Button
                        onClick={() => startRideMutation.mutate(activeRide.id)}
                        disabled={startRideMutation.isPending}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        data-testid="button-start-ride"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {startRideMutation.isPending ? "Iniciando..." : "Iniciar Corrida"}
                      </Button>
                    )}
                    {activeRide.status === 'started' && (
                      <Button
                        onClick={() => completeRideMutation.mutate({ rideId: activeRide.id })}
                        disabled={completeRideMutation.isPending}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        data-testid="button-complete-ride"
                      >
                        <Square className="mr-2 h-4 w-4" />
                        {completeRideMutation.isPending ? "Finalizando..." : "Finalizar"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Rides */}
            {!isSubscriptionExpired && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span data-testid="text-available-rides-title">Pedidos Disponíveis</span>
                    {pendingRides && pendingRides.length > 0 && (
                      <Badge className="bg-ocean-blue text-white" data-testid="badge-new-rides">
                        {pendingRides.length} novos
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingLoading ? (
                    <p>Carregando...</p>
                  ) : pendingRides && pendingRides.length > 0 ? (
                    <div className="space-y-4">
                      {pendingRides.map((ride) => (
                        <DriverRideCard
                          key={ride.id}
                          ride={ride}
                          onAccept={() => acceptRideMutation.mutate(ride.id)}
                          isAccepting={acceptRideMutation.isPending}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Nenhum pedido disponível</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Today's Stats */}
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-today-stats-title">Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-ocean-blue" data-testid="text-today-rides">
                      {completedRidesToday.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Corridas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500" data-testid="text-today-earnings">
                      {(todayEarnings / 100).toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">CVE</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-sun-yellow" data-testid="text-driver-rating">
                      {user.driver.rating?.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Avaliação</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-ride-history-title">Histórico de Corridas</CardTitle>
            </CardHeader>
            <CardContent>
              {ridesLoading ? (
                <p>Carregando...</p>
              ) : driverRides && driverRides.length > 0 ? (
                <div className="space-y-4">
                  {driverRides.map((ride) => (
                    <div
                      key={ride.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      data-testid={`card-ride-history-${ride.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 dark:text-white mb-2">
                            {ride.origin} → {ride.destination}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            <Clock className="inline w-4 h-4 mr-1" />
                            {formatDateTime(ride.requestedAt)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Passageiro: {ride.passenger?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-500">
                            {formatPrice(ride.finalPrice || ride.estimatedPrice)}
                          </div>
                          <Badge 
                            className={ride.status === 'completed' ? 'bg-green-500' : 'bg-gray-500'}
                          >
                            {ride.status === 'completed' ? 'Concluída' : 'Cancelada'}
                          </Badge>
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
        )}

        {/* Wallet Tab */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-subscription-details-title">Detalhes da Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Status</span>
                  <Badge className={`${subscriptionStatusInfo.color} text-white`}>
                    {subscriptionStatusInfo.text}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Valor Mensal</span>
                  <span className="font-semibold" data-testid="text-monthly-fee">1.500 CVE</span>
                </div>
                {subscription?.currentPeriodEnd && (
                  <div className="flex justify-between items-center">
                    <span>Próximo Vencimento</span>
                    <span data-testid="text-next-due-date">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-CV')}
                    </span>
                  </div>
                )}
                
                {isSubscriptionExpired && (
                  <Button className="w-full bg-ocean-blue hover:bg-blue-600" data-testid="button-renew-subscription">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Renovar Assinatura
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle data-testid="text-earnings-summary-title">Resumo de Ganhos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-green-500" data-testid="text-total-rides">
                      {user.driver.totalRides}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total de Corridas</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-ocean-blue" data-testid="text-average-rating">
                      {user.driver.rating?.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Avaliação Média</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-driver-profile-title">Perfil do Motorista</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Nome</span>
                  <div className="font-medium" data-testid="text-driver-name">{user.name}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                  <div className="font-medium" data-testid="text-driver-email">{user.email}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Telefone</span>
                  <div className="font-medium" data-testid="text-driver-phone">{user.phone}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Placa do Veículo</span>
                  <div className="font-medium" data-testid="text-vehicle-plate">{user.driver.licensePlate}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Modelo do Veículo</span>
                  <div className="font-medium" data-testid="text-vehicle-model">
                    {user.driver.vehicleModel || "Não informado"}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status de Verificação</span>
                  <div className="flex items-center space-x-2">
                    {user.driver.isVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span data-testid="text-verification-status">
                      {user.driver.isVerified ? "Verificado" : "Pendente"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleLogout} 
              variant="destructive" 
              className="w-full"
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-around py-2 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "home" ? "text-sun-yellow" : "text-gray-500"
            }`}
            data-testid="button-nav-home"
          >
            <Home className="h-6 w-6 mb-1" />
            <span className="text-xs">Início</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "history" ? "text-sun-yellow" : "text-gray-500"
            }`}
            data-testid="button-nav-history"
          >
            <History className="h-6 w-6 mb-1" />
            <span className="text-xs">Histórico</span>
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "wallet" ? "text-sun-yellow" : "text-gray-500"
            }`}
            data-testid="button-nav-wallet"
          >
            <Wallet className="h-6 w-6 mb-1" />
            <span className="text-xs">Carteira</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "profile" ? "text-sun-yellow" : "text-gray-500"
            }`}
            data-testid="button-nav-profile"
          >
            <User className="h-6 w-6 mb-1" />
            <span className="text-xs">Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
