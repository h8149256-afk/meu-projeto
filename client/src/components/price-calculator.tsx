import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Clock } from "lucide-react";

interface PriceCalculatorProps {
  origin: string;
  destination: string;
  onPriceCalculated: (price: number) => void;
}

interface PriceResponse {
  price: number;
  currency: string;
}

export default function PriceCalculator({ origin, destination, onPriceCalculated }: PriceCalculatorProps) {
  const [calculatedPrice, setCalculatedPrice] = useState<PriceResponse | null>(null);

  const calculatePriceMutation = useMutation({
    mutationFn: async ({ origin, destination }: { origin: string; destination: string }) => {
      const response = await apiRequest("POST", "/api/calculate-price", { origin, destination });
      return response.json() as Promise<PriceResponse>;
    },
    onSuccess: (data) => {
      setCalculatedPrice(data);
      onPriceCalculated(data.price);
    },
    onError: () => {
      setCalculatedPrice(null);
      onPriceCalculated(0);
    },
  });

  // Auto-calculate when origin and destination are filled
  useEffect(() => {
    if (origin && destination && origin !== destination) {
      calculatePriceMutation.mutate({ origin, destination });
    } else {
      setCalculatedPrice(null);
      onPriceCalculated(0);
    }
  }, [origin, destination]);

  const handleCalculatePrice = () => {
    if (origin && destination) {
      calculatePriceMutation.mutate({ origin, destination });
    }
  };

  const isCalculating = calculatePriceMutation.isPending;
  const canCalculate = origin && destination && origin !== destination;

  return (
    <Card className="bg-gradient-to-r from-ocean-blue to-blue-600 text-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Preço Estimado</h3>
          <Button
            onClick={handleCalculatePrice}
            disabled={!canCalculate || isCalculating}
            variant="secondary"
            size="sm"
            className="bg-white text-ocean-blue hover:bg-gray-100"
            data-testid="button-calculate-price"
          >
            <Calculator className="mr-2 h-4 w-4" />
            {isCalculating ? "Calculando..." : "Calcular"}
          </Button>
        </div>

        {isCalculating && (
          <div className="text-center text-blue-200">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full mb-2"></div>
            <p>Calculando preço...</p>
          </div>
        )}

        {calculatedPrice && !isCalculating && (
          <div data-testid="price-result">
            <div className="text-3xl font-bold mb-2" data-testid="text-calculated-price">
              {calculatedPrice.price} {calculatedPrice.currency}
            </div>
            <div className="text-blue-200 text-sm space-y-1">
              <div>Tarifa base: 100 CVE</div>
              <div>Estimativa baseada na rota selecionada</div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Tempo estimado: 15-25 min
              </div>
            </div>
          </div>
        )}

        {!calculatedPrice && !isCalculating && (
          <div className="text-center text-blue-200" data-testid="price-prompt">
            {!canCalculate 
              ? "Preencha origem e destino para calcular o preço"
              : "Clique em 'Calcular' para ver o preço estimado"
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}
