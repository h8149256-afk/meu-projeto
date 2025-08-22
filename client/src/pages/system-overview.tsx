import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SystemStatus, RealTimeMetrics, ActivityFeed, QuickActions, PerformanceMonitor } from "@/components/enhanced-features";
import { Shield, Zap, TrendingUp, Users } from "lucide-react";

export default function SystemOverview() {
  const { user } = useAuth();
  
  const { data: stats } = useQuery({
    queryKey: ["/api/admin-secret-2024/stats"],
    enabled: !!user && user.role === "admin",
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["/api/admin-secret-2024/audit-logs"],
    enabled: !!user && user.role === "admin",
  });

  if (!user || user.role !== "admin") {
    return <div>Acesso negado</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            MindeloRide Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visão geral completa do sistema
          </p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Sistema Online</span>
        </Badge>
      </div>

      {/* System Status and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SystemStatus />
        </div>
        <QuickActions />
      </div>

      {/* Real-time Metrics */}
      <RealTimeMetrics stats={stats} />

      {/* Activity and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed activities={auditLogs || []} />
        <PerformanceMonitor />
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Satisfação do Cliente
                </p>
                <p className="text-2xl font-bold text-blue-600">98.5%</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tempo Médio de Resposta
                </p>
                <p className="text-2xl font-bold text-green-600">2.3min</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Crescimento Mensal
                </p>
                <p className="text-2xl font-bold text-purple-600">+24%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Segurança
                </p>
                <p className="text-2xl font-bold text-yellow-600">Alta</p>
              </div>
              <Shield className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}