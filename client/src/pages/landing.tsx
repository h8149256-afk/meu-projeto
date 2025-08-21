import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Car, 
  Clock, 
  Shield, 
  DollarSign, 
  MapPin, 
  Phone, 
  User, 
  Star,
  Moon,
  Sun,
  Menu,
  X 
} from "lucide-react";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-coastal-mist dark:bg-deep-ocean transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glassmorphism dark:glassmorphism-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-ocean-blue to-blue-600 rounded-xl flex items-center justify-center">
                <Car className="text-white h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">MindeloRide</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('como-funciona')}
                className="text-gray-600 dark:text-gray-300 hover:text-ocean-blue transition-colors"
                data-testid="link-how-it-works"
              >
                Como Funciona
              </button>
              <button 
                onClick={() => scrollToSection('precos')}
                className="text-gray-600 dark:text-gray-300 hover:text-ocean-blue transition-colors"
                data-testid="link-pricing"
              >
                Preços
              </button>
              <button 
                onClick={() => scrollToSection('suporte')}
                className="text-gray-600 dark:text-gray-300 hover:text-ocean-blue transition-colors"
                data-testid="link-support"
              >
                Suporte
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-ocean-blue transition-colors"
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              
              <div className="hidden md:flex items-center space-x-4">
                <Link to="/auth">
                  <Button 
                    variant="outline" 
                    className="border-ocean-blue text-ocean-blue hover:bg-ocean-blue hover:text-white"
                    data-testid="button-login"
                  >
                    Entrar
                  </Button>
                </Link>
                <Link to="/auth?mode=passenger">
                  <Button 
                    className="bg-ocean-blue hover:bg-blue-600 text-white"
                    data-testid="button-request-ride"
                  >
                    Pedir Táxi
                  </Button>
                </Link>
              </div>

              <button
                className="md:hidden p-2 text-gray-600 dark:text-gray-300"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-white/20 pt-4 pb-4">
              <div className="flex flex-col space-y-4">
                <button 
                  onClick={() => scrollToSection('como-funciona')}
                  className="text-left text-gray-600 dark:text-gray-300 hover:text-ocean-blue transition-colors"
                >
                  Como Funciona
                </button>
                <button 
                  onClick={() => scrollToSection('precos')}
                  className="text-left text-gray-600 dark:text-gray-300 hover:text-ocean-blue transition-colors"
                >
                  Preços
                </button>
                <button 
                  onClick={() => scrollToSection('suporte')}
                  className="text-left text-gray-600 dark:text-gray-300 hover:text-ocean-blue transition-colors"
                >
                  Suporte
                </button>
                <div className="flex space-x-4 pt-4">
                  <Link to="/auth" className="flex-1">
                    <Button variant="outline" className="w-full border-ocean-blue text-ocean-blue hover:bg-ocean-blue hover:text-white">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/auth?mode=passenger" className="flex-1">
                    <Button className="w-full bg-ocean-blue hover:bg-blue-600 text-white">
                      Pedir Táxi
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 hero-gradient relative overflow-hidden">
        {/* Ocean wave pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0 animate-wave" 
            style={{
              backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 20'><path d='M0,10 Q25,0 50,10 T100,10 V20 H0 Z' fill='white' opacity='0.1'/></svg>")`,
              backgroundSize: '200px 40px'
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Transporte Inteligente
              <br />em <span className="text-sun-yellow">Mindelo</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto">
              Conectamos passageiros e motoristas de forma rápida e segura. 
              Solicite sua corrida em segundos, sem complicações.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth?mode=passenger">
                <Button 
                  size="lg" 
                  className="px-8 py-4 bg-white text-ocean-blue hover:bg-gray-50 text-lg font-semibold shadow-xl"
                  data-testid="button-hero-request-ride"
                >
                  <Car className="mr-2 h-5 w-5" />
                  Pedir Táxi Agora
                </Button>
              </Link>
              <Link to="/auth?mode=driver">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-ocean-blue text-lg font-semibold"
                  data-testid="button-hero-become-driver"
                >
                  <User className="mr-2 h-5 w-5" />
                  Ser Motorista
                </Button>
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="glassmorphism border-white/20 text-white bg-transparent">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-sun-yellow rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Clock className="text-gray-800 h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2" data-testid="text-feature-fast">Rápido</h3>
                  <p className="text-blue-100 text-sm">Motoristas conectados 24/7</p>
                </CardContent>
              </Card>
              <Card className="glassmorphism border-white/20 text-white bg-transparent">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-sun-yellow rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Shield className="text-gray-800 h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2" data-testid="text-feature-safe">Seguro</h3>
                  <p className="text-blue-100 text-sm">Motoristas verificados</p>
                </CardContent>
              </Card>
              <Card className="glassmorphism border-white/20 text-white bg-transparent">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-sun-yellow rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <DollarSign className="text-gray-800 h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2" data-testid="text-feature-fair">Preços Justos</h3>
                  <p className="text-blue-100 text-sm">Tabela oficial de Mindelo</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="como-funciona" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-4" data-testid="text-how-it-works-title">
              Como Funciona
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Simples como 1, 2, 3</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-ocean-blue to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Informe o Destino</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Digite onde está e para onde quer ir. Nosso sistema calcula o preço automaticamente.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-ocean-blue to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Encontre um Motorista</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Um motorista próximo aceita sua corrida e você recebe os detalhes do contato.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-ocean-blue to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Chegue ao Destino</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Relaxe durante a viagem e avalie o motorista ao final.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-4" data-testid="text-pricing-title">
              Preços Transparentes
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Baseados na tabela oficial de Mindelo</p>
          </div>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">Rotas Populares</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Centro → Laginha</span>
                      <span className="font-semibold text-ocean-blue" data-testid="text-price-centro-laginha">300 CVE</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Centro → Aeroporto</span>
                      <span className="font-semibold text-ocean-blue" data-testid="text-price-centro-airport">1.200 CVE</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Laginha → Ribeira Bote</span>
                      <span className="font-semibold text-ocean-blue" data-testid="text-price-laginha-ribeira">450 CVE</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">Tarifas</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Tarifa Base</span>
                      <span className="font-semibold text-ocean-blue" data-testid="text-base-fare">100 CVE</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Por Km</span>
                      <span className="font-semibold text-ocean-blue" data-testid="text-per-km">80 CVE</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Noite (22h-6h)</span>
                      <span className="font-semibold text-sun-yellow" data-testid="text-night-multiplier">+20%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Driver CTA Section */}
      <section className="py-20 bg-gradient-to-br from-sun-yellow to-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-4" data-testid="text-driver-cta-title">
            Seja um Motorista
          </h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Primeiro mês grátis! Depois apenas 1.500 CVE/mês. 
            Comece a ganhar dinheiro com seu carro hoje mesmo.
          </p>
          <Link to="/auth?mode=driver">
            <Button 
              size="lg" 
              className="px-8 py-4 bg-gray-800 text-white hover:bg-gray-700 text-lg font-semibold shadow-xl"
              data-testid="button-become-driver"
            >
              <User className="mr-2 h-5 w-5" />
              Cadastrar como Motorista
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="suporte" className="bg-deep-ocean text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-ocean-blue rounded-lg flex items-center justify-center">
                  <Car className="text-white h-5 w-5" />
                </div>
                <span className="text-xl font-bold">MindeloRide</span>
              </div>
              <p className="text-gray-300">Transporte inteligente para Mindelo, Cabo Verde.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Para Passageiros</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link to="/auth?mode=passenger" className="hover:text-white">Pedir Corrida</Link></li>
                <li><Link to="/passenger" className="hover:text-white">Histórico</Link></li>
                <li><Link to="/passenger" className="hover:text-white">Favoritos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Para Motoristas</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link to="/auth?mode=driver" className="hover:text-white">Cadastre-se</Link></li>
                <li><Link to="/driver" className="hover:text-white">Assinatura</Link></li>
                <li><a href="#" className="hover:text-white">Suporte</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Contato</a></li>
                <li><a href="#" className="hover:text-white">Termos</a></li>
                <li><a href="#" className="hover:text-white">Privacidade</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 MindeloRide. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
