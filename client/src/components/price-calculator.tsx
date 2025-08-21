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
    <Card className="border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Calculadora de Preço
          </h3>
        </div>

        {!canCalculate && (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Selecione origem e destino para calcular o preço
          </p>
        )}

        {canCalculate && (
          <div className="space-y-3">
            <Button
              onClick={handleCalculatePrice}
              disabled={isCalculating}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              data-testid="button-calculate-price"
            >
              {isCalculating ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular Preço
                </>
              )}
            </Button>

            {calculatedPrice && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="text-center">
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                    Preço estimado:
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100" data-testid="text-calculated-price">
                    {calculatedPrice.price} {calculatedPrice.currency}
                  </p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                    {origin} → {destination}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}