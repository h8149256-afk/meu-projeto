import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PriceCalculator from "@/components/price-calculator";
import { insertRideSchema } from "@shared/schema";
import { MapPin, Phone, MessageCircle, Car } from "lucide-react";
import { z } from "zod";

const rideRequestSchema = insertRideSchema.pick({
  origin: true,
  destination: true,
  passengerPhone: true,
  notes: true,
});

type RideRequestFormData = z.infer<typeof rideRequestSchema>;

// Common locations in Mindelo
const locations = [
  "Centro",
  "Laginha", 
  "Ribeira Bote",
  "Mindelo Aeroporto",
  "Hospital Baptista de Sousa",
  "Mercado Municipal",
  "Porto Grande",
  "Escola Secundária Ludgero Lima",
  "Universidade de Cabo Verde",
  "Estádio Municipal Adérito Sena"
];

export default function RideRequestForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

  const form = useForm<RideRequestFormData>({
    resolver: zodResolver(rideRequestSchema),
    defaultValues: {
      origin: "",
      destination: "",
      passengerPhone: user?.phone || "",
      notes: "",
    },
  });

  // Update phone when user data loads
  useEffect(() => {
    if (user?.phone) {
      form.setValue('passengerPhone', user.phone);
    }
  }, [user?.phone, form]);

  const createRideMutation = useMutation({
    mutationFn: async (data: RideRequestFormData) => {
      if (!calculatedPrice) {
        throw new Error("Calcule o preço antes de solicitar a corrida");
      }

      // Include required fields for the API
      const rideData = {
        ...data,
        estimatedPrice: calculatedPrice * 100, // Convert to cents
      };

      const response = await apiRequest("POST", "/api/rides", rideData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Corrida solicitada!",
        description: "Aguardando motorista aceitar sua solicitação.",
      });
      
      form.reset();
      setCalculatedPrice(null);
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao solicitar corrida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePriceCalculated = (price: number) => {
    setCalculatedPrice(price);
  };

  const handleSubmit = (data: RideRequestFormData) => {
    createRideMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center" data-testid="text-ride-request-title">
          <Car className="mr-2 h-5 w-5" />
          Nova Corrida
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Origin */}
          <div className="space-y-2">
            <Label htmlFor="origin" className="flex items-center">
              <MapPin className="w-4 h-4 text-green-500 mr-2" />
              Origem
            </Label>
            <Input
              id="origin"
              list="locations-origin"
              placeholder="Centro, Laginha, Ribeira Bote..."
              data-testid="input-ride-origin"
              {...form.register("origin")}
            />
            <datalist id="locations-origin">
              {locations.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>
            {form.formState.errors.origin && (
              <p className="text-sm text-destructive" data-testid="error-ride-origin">
                {form.formState.errors.origin.message}
              </p>
            )}
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination" className="flex items-center">
              <MapPin className="w-4 h-4 text-red-500 mr-2" />
              Destino
            </Label>
            <Input
              id="destination"
              list="locations-destination"
              placeholder="Para onde você vai?"
              data-testid="input-ride-destination"
              {...form.register("destination")}
            />
            <datalist id="locations-destination">
              {locations.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>
            {form.formState.errors.destination && (
              <p className="text-sm text-destructive" data-testid="error-ride-destination">
                {form.formState.errors.destination.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="passengerPhone" className="flex items-center">
              <Phone className="w-4 h-4 text-ocean-blue mr-2" />
              Telefone
            </Label>
            <Input
              id="passengerPhone"
              type="tel"
              placeholder="+238 xxx xxxx"
              data-testid="input-ride-phone"
              {...form.register("passengerPhone")}
            />
            {form.formState.errors.passengerPhone && (
              <p className="text-sm text-destructive" data-testid="error-ride-phone">
                {form.formState.errors.passengerPhone.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center">
              <MessageCircle className="w-4 h-4 text-gray-500 mr-2" />
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Ponto de referência, instruções especiais..."
              data-testid="input-ride-notes"
              {...form.register("notes")}
            />
          </div>

          {/* Price Calculator */}
          <PriceCalculator
            origin={form.watch("origin")}
            destination={form.watch("destination")}
            onPriceCalculated={handlePriceCalculated}
          />

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full bg-sun-yellow text-gray-800 hover:bg-yellow-400 font-bold text-lg py-3"
            disabled={!calculatedPrice || createRideMutation.isPending}
            data-testid="button-call-taxi"
          >
            <Car className="mr-2 h-5 w-5" />
            {createRideMutation.isPending ? "Solicitando..." : "Chamar Táxi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
