import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Phone, Check, X } from "lucide-react";
import type { RideWithDetails } from "@shared/schema";

interface DriverRideCardProps {
  ride: RideWithDetails;
  onAccept: () => void;
  onReject?: () => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
}

export default function DriverRideCard({ 
  ride, 
  onAccept, 
  onReject,
  isAccepting = false,
  isRejecting = false 
}: DriverRideCardProps) {
  const formatPrice = (priceInCents: number) => {
    return `${(priceInCents / 100).toFixed(0)} CVE`;
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return "Agora mesmo";
    if (minutes === 1) return "Há 1 minuto";
    return `Há ${minutes} minutos`;
  };

  const estimatedDuration = "15-25 min"; // Could be calculated based on route

  return (
    <Card 
      className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
      data-testid={`card-ride-request-${ride.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Clock className="w-4 h-4 mr-1" />
              <span data-testid={`text-ride-time-${ride.id}`}>
                {getTimeAgo(ride.requestedAt)}
              </span>
            </div>
            
            <div className="font-medium text-gray-800 dark:text-white mb-2">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-green-500 mr-2" />
                <span data-testid={`text-ride-origin-${ride.id}`}>{ride.origin}</span>
              </div>
              <div className="flex items-center mt-1">
                <span className="w-4 h-4 flex justify-center mr-2">
                  <span className="text-gray-400">→</span>
                </span>
                <MapPin className="w-4 h-4 text-red-500 mr-2" />
                <span data-testid={`text-ride-destination-${ride.id}`}>{ride.destination}</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                <span data-testid={`text-ride-phone-${ride.id}`}>
                  {ride.passengerPhone}
                </span>
              </div>
              
              {ride.passenger && (
                <div data-testid={`text-ride-passenger-${ride.id}`}>
                  Passageiro: {ride.passenger.name}
                </div>
              )}

              {ride.notes && (
                <div className="text-xs text-gray-500 italic">
                  <span data-testid={`text-ride-notes-${ride.id}`}>
                    "{ride.notes}"
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right ml-4">
            <div className="text-2xl font-bold text-ocean-blue mb-1" data-testid={`text-ride-price-${ride.id}`}>
              {formatPrice(ride.estimatedPrice)}
            </div>
            <div className="text-sm text-gray-500" data-testid={`text-ride-duration-${ride.id}`}>
              ~{estimatedDuration}
            </div>
            <Badge variant="outline" className="mt-1 text-xs">
              {ride.status === 'pending' ? 'Novo' : ride.status}
            </Badge>
          </div>
        </div>
        
        {ride.status === 'pending' && (
          <div className="flex gap-2 mt-4">
            <Button
              onClick={onAccept}
              disabled={isAccepting || isRejecting}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              data-testid={`button-accept-ride-${ride.id}`}
            >
              <Check className="mr-2 h-4 w-4" />
              {isAccepting ? "Aceitando..." : "Aceitar"}
            </Button>
            
            {onReject && (
              <Button
                onClick={onReject}
                disabled={isAccepting || isRejecting}
                variant="outline"
                className="flex-1 border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                data-testid={`button-reject-ride-${ride.id}`}
              >
                <X className="mr-2 h-4 w-4" />
                {isRejecting ? "Recusando..." : "Recusar"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
