import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import RideRequestForm from "@/components/ride-request-form";
import PriceCalculator from "@/components/price-calculator";
import { 
  Home, 
  History, 
  Heart, 
  User, 
  Car,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  LogOut
} from "lucide-react";
import type { RideWithDetails } from "@shared/schema";

export default function PassengerDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const websocket = useWebSocket();
  const [activeTab, setActiveTab] = useState("home");

  // Redirect if not authenticated or not a passenger
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth");
    } else if (user?.role !== "passenger") {
      setLocation("/");
    }
  }, [isAuthenticated, user, setLocation]);

  // WebSocket event listeners
  useEffect(() => {
    const handleRideAccepted = (data: any) => {
      toast({
        title: "Corrida aceita!",
        description: `${data.ride.driver?.user?.name} está a caminho. Telefone: ${data.ride.driver?.user?.phone}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
    };

    const handleRideStarted = (data: any) => {
      toast({
        title: "Corrida iniciada!",
        description: "O motorista iniciou sua corrida.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
    };

    const handleRideCompleted = (data: any) => {
      toast({
        title: "Corrida finalizada!",
        description: "Obrigado por usar o MindeloRide. Avalie sua experiência!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
    };

    websocket.on('ride_accepted', handleRideAccepted);
    websocket.on('ride_started', handleRideStarted);
    websocket.on('ride_completed', handleRideCompleted);

    return () => {
      websocket.off('ride_accepted', handleRideAccepted);
      websocket.off('ride_started', handleRideStarted);
      websocket.off('ride_completed', handleRideCompleted);
    };
  }, [websocket, toast, queryClient]);

  // Fetch user's rides
  const { data: rides, isLoading: ridesLoading } = useQuery<RideWithDetails[]>({
    queryKey: ["/api/rides"],
    enabled: !!user,
  });

  // Fetch favorites
  const { data: favorites } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

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

  const formatPrice = (priceInCents: number) => {
    return `${(priceInCents / 100).toFixed(0)} CVE`;
  };

  const formatDateTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString('pt-CV');
  };

  return (
    <div className="min-h-screen bg-coastal-mist dark:bg-deep-ocean">
      {/* Header */}
      <div className="bg-ocean-blue text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-semibold" data-testid="text-passenger-title">
            {activeTab === "home" && "Pedir Corrida"}
            {activeTab === "history" && "Histórico"}
            {activeTab === "favorites" && "Favoritos"}
            {activeTab === "profile" && "Perfil"}
          </h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm" data-testid="text-user-name">{user.name}</span>
            <User className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
        {/* Home Tab - Ride Request */}
        {activeTab === "home" && (
          <>
            <RideRequestForm />
            
            {/* Recent Rides */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center" data-testid="text-recent-rides-title">
                  <Clock className="mr-2 h-5 w-5" />
                  Corridas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ridesLoading ? (
                  <p>Carregando...</p>
                ) : rides && rides.length > 0 ? (
                  <div className="space-y-3">
                    {rides.slice(0, 3).map((ride) => (
                      <div
                        key={ride.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        data-testid={`card-recent-ride-${ride.id}`}
                      >
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">
                            <MapPin className="inline w-4 h-4 text-green-500 mr-1" />
                            {ride.origin} → {ride.destination}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDateTime(ride.requestedAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600" data-testid={`text-ride-price-${ride.id}`}>
                            {formatPrice(ride.estimatedPrice)}
                          </div>
                          <div className="text-sm">
                            {getStatusBadge(ride.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Nenhuma corrida encontrada</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-history-title">Todas as Corridas</CardTitle>
            </CardHeader>
            <CardContent>
              {ridesLoading ? (
                <p>Carregando...</p>
              ) : rides && rides.length > 0 ? (
                <div className="space-y-4">
                  {rides.map((ride) => (
                    <div
                      key={ride.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      data-testid={`card-ride-history-${ride.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 dark:text-white mb-2">
                            <MapPin className="inline w-4 h-4 text-green-500 mr-1" />
                            {ride.origin}
                            <span className="mx-2 text-gray-400">→</span>
                            <MapPin className="inline w-4 h-4 text-red-500 mr-1" />
                            {ride.destination}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            <Clock className="inline w-4 h-4 mr-1" />
                            {formatDateTime(ride.requestedAt)}
                          </div>
                          {ride.driver && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              <User className="inline w-4 h-4 mr-1" />
                              {ride.driver.user?.name} - {ride.driver.licensePlate}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-ocean-blue">
                            {formatPrice(ride.finalPrice || ride.estimatedPrice)}
                          </div>
                          <div className="text-sm">
                            {getStatusBadge(ride.status)}
                          </div>
                        </div>
                      </div>
                      {ride.notes && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Observações:</strong> {ride.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhuma corrida encontrada</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Favorites Tab */}
        {activeTab === "favorites" && (
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-favorites-title">Motoristas Favoritos</CardTitle>
            </CardHeader>
            <CardContent>
              {favorites && favorites.length > 0 ? (
                <div className="space-y-3">
                  {favorites.map((driver: any) => (
                    <div
                      key={driver.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      data-testid={`card-favorite-driver-${driver.id}`}
                    >
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {driver.user?.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {driver.licensePlate} - {driver.vehicleModel}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sun-yellow">
                          ⭐ {driver.rating?.toFixed(1)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-unfavorite-${driver.id}`}
                        >
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhum motorista favoritado</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-profile-title">Meu Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded" data-testid="text-profile-name">
                    {user.name}
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded" data-testid="text-profile-email">
                    {user.email}
                  </div>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded" data-testid="text-profile-phone">
                    {user.phone || "Não informado"}
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
              activeTab === "home" ? "text-ocean-blue" : "text-gray-500"
            }`}
            data-testid="button-nav-home"
          >
            <Home className="h-6 w-6 mb-1" />
            <span className="text-xs">Início</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "history" ? "text-ocean-blue" : "text-gray-500"
            }`}
            data-testid="button-nav-history"
          >
            <History className="h-6 w-6 mb-1" />
            <span className="text-xs">Histórico</span>
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "favorites" ? "text-ocean-blue" : "text-gray-500"
            }`}
            data-testid="button-nav-favorites"
          >
            <Heart className="h-6 w-6 mb-1" />
            <span className="text-xs">Favoritos</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === "profile" ? "text-ocean-blue" : "text-gray-500"
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
