import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { loginSchema, registerSchema, insertRideSchema } from "@shared/schema";
import { z } from "zod";

// Price calculation engine
interface PriceConfig {
  currency: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  nightMultiplier: number;
  weekendMultiplier: number;
  zones: Array<{
    name: string;
    fixedPrice: number;
  }>;
  periods: {
    day: { start: string; end: string };
    night: { start: string; end: string };
  };
}

const defaultPriceConfig: PriceConfig = {
  currency: "CVE",
  baseFare: 100,
  perKm: 80,
  perMin: 0,
  nightMultiplier: 1.2,
  weekendMultiplier: 1.15,
  zones: [
    { name: "Centro→Laginha", fixedPrice: 300 },
    { name: "Centro→Aeroporto", fixedPrice: 1200 },
    { name: "Laginha→Ribeira Bote", fixedPrice: 450 },
  ],
  periods: {
    day: { start: "06:00", end: "21:59" },
    night: { start: "22:00", end: "05:59" }
  }
};

function calculatePrice(origin: string, destination: string): number {
  const routeName = `${origin}→${destination}`;
  const reverseRouteName = `${destination}→${origin}`;
  
  // Check for fixed price routes
  const fixedRoute = defaultPriceConfig.zones.find(
    zone => zone.name === routeName || zone.name === reverseRouteName
  );
  
  if (fixedRoute) {
    return fixedRoute.fixedPrice;
  }
  
  // Default calculation (base fare + estimated distance)
  const estimatedDistance = 3; // Default 3km for unknown routes
  return defaultPriceConfig.baseFare + (estimatedDistance * defaultPriceConfig.perKm);
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.token) {
          const user = await storage.getUserByToken(data.token);
          if (user) {
            userId = user.id;
            clients.set(userId, ws);
            ws.send(JSON.stringify({ type: 'auth_success', userId }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
      }
    });
  });

  function broadcastToUser(userId: string, message: any) {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  function broadcastToDrivers(message: any) {
    clients.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN) {
        // We'd need to check if user is a driver, but for now broadcast to all
        ws.send(JSON.stringify(message));
      }
    });
  }

  // Middleware to extract user from token
  async function authMiddleware(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token necessário' });
    }

    const token = authHeader.substring(7);
    const user = await storage.getUserByToken(token);
    
    if (!user) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.user = user;
    next();
  }

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const result = await storage.login(credentials);
      
      if (!result) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      res.json(result);
    } catch (error) {
      res.status(400).json({ message: 'Dados inválidos' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }

      const result = await storage.register(userData);
      res.json(result);
    } catch (error: any) {
      if (error.errors) {
        res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      } else {
        res.status(400).json({ message: error.message || 'Erro ao registrar usuário' });
      }
    }
  });

  app.get('/api/auth/me', authMiddleware, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Price calculation
  app.post('/api/calculate-price', (req, res) => {
    try {
      const { origin, destination } = req.body;
      if (!origin || !destination) {
        return res.status(400).json({ message: 'Origem e destino são obrigatórios' });
      }

      const price = calculatePrice(origin, destination);
      res.json({ price, currency: 'CVE' });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao calcular preço' });
    }
  });

  // Ride routes
  app.post('/api/rides', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'passenger') {
        return res.status(403).json({ message: 'Apenas passageiros podem solicitar corridas' });
      }

      const rideData = insertRideSchema.parse({
        ...req.body,
        passengerId: req.user.id,
        passengerPhone: req.user.phone || req.body.passengerPhone,
        estimatedPrice: calculatePrice(req.body.origin, req.body.destination) * 100, // Store in cents
      });

      const ride = await storage.createRide(rideData);
      
      // Notify drivers about new ride
      broadcastToDrivers({
        type: 'new_ride',
        ride: await storage.getRide(ride.id)
      });

      res.json(ride);
    } catch (error) {
      res.status(400).json({ message: 'Dados inválidos' });
    }
  });

  app.get('/api/rides', authMiddleware, async (req: any, res) => {
    try {
      let rides;
      if (req.user.role === 'passenger') {
        rides = await storage.getRidesByPassenger(req.user.id);
      } else if (req.user.role === 'driver' && req.user.driver) {
        rides = await storage.getRidesByDriver(req.user.driver.id);
      } else {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      res.json(rides);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar corridas' });
    }
  });

  app.get('/api/rides/pending', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'driver') {
        return res.status(403).json({ message: 'Apenas motoristas podem ver pedidos pendentes' });
      }

      const rides = await storage.getPendingRides();
      res.json(rides);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar corridas pendentes' });
    }
  });

  app.patch('/api/rides/:id/accept', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'driver' || !req.user.driver) {
        return res.status(403).json({ message: 'Apenas motoristas podem aceitar corridas' });
      }

      // Check subscription status
      const subscription = await storage.getSubscriptionByDriverId(req.user.driver.id);
      if (subscription && subscription.status === 'expired') {
        return res.status(403).json({ message: 'Assinatura expirada. Renove para aceitar corridas.' });
      }

      const ride = await storage.updateRideStatus(req.params.id, 'accepted', req.user.driver.id);
      if (!ride) {
        return res.status(404).json({ message: 'Corrida não encontrada' });
      }

      // Notify passenger
      broadcastToUser(ride.passengerId, {
        type: 'ride_accepted',
        ride: await storage.getRide(ride.id)
      });

      res.json(ride);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao aceitar corrida' });
    }
  });

  app.patch('/api/rides/:id/start', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'driver') {
        return res.status(403).json({ message: 'Apenas motoristas podem iniciar corridas' });
      }

      const ride = await storage.updateRideStatus(req.params.id, 'started');
      if (!ride) {
        return res.status(404).json({ message: 'Corrida não encontrada' });
      }

      // Notify passenger
      broadcastToUser(ride.passengerId, {
        type: 'ride_started',
        ride: await storage.getRide(ride.id)
      });

      res.json(ride);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao iniciar corrida' });
    }
  });

  app.patch('/api/rides/:id/complete', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'driver') {
        return res.status(403).json({ message: 'Apenas motoristas podem finalizar corridas' });
      }

      const { finalPrice, distance } = req.body;
      const ride = await storage.updateRideStatus(req.params.id, 'completed');
      
      if (ride) {
        // Update final price and distance if provided
        if (finalPrice || distance) {
          // Here you'd update the ride with final details
        }
        
        // Update driver stats
        if (req.user.driver) {
          await storage.updateDriver(req.user.driver.id, {
            totalRides: req.user.driver.totalRides + 1
          });
        }
      }

      // Notify passenger
      if (ride) {
        broadcastToUser(ride.passengerId, {
          type: 'ride_completed',
          ride: await storage.getRide(ride.id)
        });
      }

      res.json(ride);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao finalizar corrida' });
    }
  });

  // Favorites routes
  app.post('/api/favorites', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'passenger') {
        return res.status(403).json({ message: 'Apenas passageiros podem favoritar motoristas' });
      }

      const { driverId } = req.body;
      await storage.addFavorite(req.user.id, driverId);
      res.json({ message: 'Motorista favoritado com sucesso' });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao favoritar motorista' });
    }
  });

  app.delete('/api/favorites/:driverId', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'passenger') {
        return res.status(403).json({ message: 'Apenas passageiros podem desfavoritar motoristas' });
      }

      await storage.removeFavorite(req.user.id, req.params.driverId);
      res.json({ message: 'Motorista desfavoritado com sucesso' });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao desfavoritar motorista' });
    }
  });

  app.get('/api/favorites', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'passenger') {
        return res.status(403).json({ message: 'Apenas passageiros podem ver favoritos' });
      }

      const favorites = await storage.getFavoritesByPassenger(req.user.id);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar favoritos' });
    }
  });

  // Admin routes (hidden)
  app.get('/api/admin-secret-2024/stats', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar estatísticas' });
    }
  });

  app.get('/api/admin-secret-2024/users', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
  });

  app.get('/api/admin-secret-2024/rides', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const rides = await storage.getAllRides();
      res.json(rides);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar corridas' });
    }
  });

  return httpServer;
}
