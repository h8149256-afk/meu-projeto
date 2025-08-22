import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Activity, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Zap,
  Star,
  MapPin,
  Phone
} from "lucide-react";

// System Status Component
export function SystemStatus() {
  const { data: health } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-sm">
          <Shield className="mr-2 h-4 w-4" />
          Status do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={`flex items-center space-x-2 ${getStatusColor(health?.status || 'unknown')}`}>
            {getStatusIcon(health?.status || 'unknown')}
            <span className="text-sm font-medium">
              {health?.status === 'healthy' ? 'Sistema Operacional' : 'Verificando...'}
            </span>
          </div>
          {health?.uptime && (
            <div className="text-xs text-gray-500">
              Ativo há: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Real-time Metrics Component
export function RealTimeMetrics({ stats }: { stats: any }) {
  const [previousStats, setPreviousStats] = useState<any>(null);
  
  useEffect(() => {
    if (stats && previousStats) {
      // Add animation or highlight changes
    }
    setPreviousStats(stats);
  }, [stats]);

  const metrics = [
    {
      label: "Usuários Online",
      value: stats?.activeUsers || 0,
      icon: <Activity className="h-4 w-4" />,
      color: "text-blue-600",
      change: "+2"
    },
    {
      label: "Corridas Ativas",
      value: stats?.activeRides || 0,
      icon: <MapPin className="h-4 w-4" />,
      color: "text-green-600",
      change: "+1"
    },
    {
      label: "Motoristas Online",
      value: stats?.onlineDrivers || 0,
      icon: <Zap className="h-4 w-4" />,
      color: "text-purple-600",
      change: "0"
    },
    {
      label: "Taxa de Sucesso",
      value: `${stats?.successRate || 0}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-yellow-600",
      change: "+0.5%"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-800 ${metric.color}`}>
                {metric.icon}
              </div>
              <Badge variant="outline" className="text-xs">
                {metric.change}
              </Badge>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="text-xs text-gray-500">{metric.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Enhanced Activity Feed Component
export function ActivityFeed({ activities }: { activities: any[] }) {
  const getActivityIcon = (action: string) => {
    if (action.includes('login')) return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (action.includes('register')) return <Star className="h-3 w-3 text-blue-500" />;
    if (action.includes('ride')) return <MapPin className="h-3 w-3 text-purple-500" />;
    if (action.includes('admin')) return <Shield className="h-3 w-3 text-red-500" />;
    return <Activity className="h-3 w-3 text-gray-500" />;
  };

  const formatActivityMessage = (activity: any) => {
    const actions: { [key: string]: string } = {
      'login_success': 'realizou login',
      'register_success': 'criou uma conta',
      'ride_requested': 'solicitou uma corrida',
      'ride_accepted': 'aceitou uma corrida',
      'ride_completed': 'completou uma corrida',
      'admin_action': 'realizou ação administrativa'
    };

    return actions[activity.action] || activity.action;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activities?.slice(0, 10).map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">Usuário</span> {formatActivityMessage(activity)}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString('pt-CV')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Actions Component
export function QuickActions() {
  const { user } = useAuth();
  
  const actions = [
    {
      label: "Exportar Dados",
      description: "Baixar relatórios do sistema",
      icon: <TrendingUp className="h-4 w-4" />,
      action: () => console.log('Export data')
    },
    {
      label: "Configurações",
      description: "Ajustar parâmetros do sistema",
      icon: <Shield className="h-4 w-4" />,
      action: () => console.log('Settings')
    },
    {
      label: "Suporte",
      description: "Contatar equipe técnica",
      icon: <Phone className="h-4 w-4" />,
      action: () => console.log('Support')
    }
  ];

  if (user?.role !== 'admin') return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
              onClick={action.action}
            >
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded">
                  {action.icon}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Performance Monitor Component
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    responseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate performance metrics
      setMetrics({
        responseTime: Math.random() * 100 + 50,
        memoryUsage: Math.random() * 80 + 20,
        cpuUsage: Math.random() * 60 + 10
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Activity className="mr-2 h-4 w-4" />
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span>Tempo de Resposta</span>
              <span>{metrics.responseTime.toFixed(0)}ms</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(metrics.responseTime, 100)}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm">
              <span>Uso de Memória</span>
              <span>{metrics.memoryUsage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${metrics.memoryUsage}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm">
              <span>Uso de CPU</span>
              <span>{metrics.cpuUsage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${metrics.cpuUsage}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}