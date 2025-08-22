import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { security } from "./security";
import { loginSchema, registerSchema, insertRideSchema } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";

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
  
  // Global rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite de 100 requests por janela por IP
    message: { message: 'Muitas tentativas, tente novamente em 15 minutos' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Rate limiting específico para auth
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, // 10 tentativas de login por IP
    message: { message: 'Muitas tentativas de login, tente novamente em 15 minutos' },
    skipSuccessfulRequests: true,
  });
  
  app.use('/api/', limiter);
  app.use('/api/auth/', authLimiter);
  
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
      } catch {
        console.error("Invalid WebSocket message format:", message.toString());
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
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ Token não fornecido para:', req.path);
        return res.status(401).json({ message: 'Token necessário' });
      }

      const token = authHeader.substring(7);
      if (!token.trim()) {
        console.log('❌ Token vazio para:', req.path);
        return res.status(401).json({ message: 'Token inválido' });
      }

      const user = await storage.getUserByToken(token);
      
      if (!user) {
        console.log('❌ Token inválido ou usuário não encontrado para:', req.path);
        return res.status(401).json({ message: 'Token inválido ou expirado' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('❌ Erro no middleware de autenticação:', error);
      res.status(401).json({ message: 'Erro na autenticação' });
    }
  }

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      console.log('🔐 Tentativa de login para:', req.body.email, 'IP:', clientIp);
      
      // Rate limiting
      const rateLimitKey = `login:${clientIp}:${req.body.email}`;
      if (!security.checkRateLimit(rateLimitKey)) {
        console.log('🚫 Rate limit atingido para:', req.body.email);
        return res.status(429).json({ 
          message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' 
        });
      }
      
      // Validate and sanitize input
      const sanitizedEmail = security.sanitizeInput(req.body.email);
      const credentials = loginSchema.parse({
        email: sanitizedEmail,
        password: req.body.password
      });
      
      // Additional email validation
      const emailValidation = security.validateEmail(credentials.email);
      if (!emailValidation.isValid) {
        return res.status(400).json({ message: emailValidation.message });
      }
      
      // Attempt login
      const result = await storage.login(credentials);
      
      if (!result) {
        console.log('❌ Login falhou - credenciais inválidas para:', credentials.email);
        await storage.logAction(null, 'login_failed', { 
          email: credentials.email, 
          ip: clientIp,
          userAgent: req.headers['user-agent'] 
        });
        return res.status(401).json({ message: 'Email ou senha incorretos' });
      }

      // Reset rate limit on successful login
      security.resetRateLimit(rateLimitKey);
      
      console.log('✅ Login realizado com sucesso para:', result.user.email, 'como', result.user.role);
      await storage.logAction(result.user.id, 'login_success', { 
        ip: clientIp,
        userAgent: req.headers['user-agent']
      });
      
      res.json(result);
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      if (error.errors) {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: 'Dados inválidos' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      console.log('📝 Tentativa de registro para:', req.body.email, 'como', req.body.role, 'IP:', clientIp);
      
      // Rate limiting for registrations
      const rateLimitKey = `register:${clientIp}`;
      if (!security.checkRateLimit(rateLimitKey)) {
        console.log('🚫 Rate limit atingido para registro do IP:', clientIp);
        return res.status(429).json({ 
          message: 'Muitas tentativas de registro. Tente novamente em 15 minutos.' 
        });
      }
      
      // Validate and sanitize input
      const sanitizedData = {
        email: security.sanitizeInput(req.body.email),
        name: security.sanitizeInput(req.body.name),
        phone: security.sanitizeInput(req.body.phone),
        licensePlate: req.body.licensePlate ? security.sanitizeInput(req.body.licensePlate) : undefined,
        vehicleModel: req.body.vehicleModel ? security.sanitizeInput(req.body.vehicleModel) : undefined,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        role: req.body.role
      };
      
      // Additional email validation
      const emailValidation = security.validateEmail(sanitizedData.email);
      if (!emailValidation.isValid) {
        return res.status(400).json({ message: emailValidation.message });
      }
      
      // Password strength validation
      const passwordValidation = security.validatePasswordStrength(sanitizedData.password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ message: passwordValidation.message });
      }
      
      const userData = registerSchema.parse(sanitizedData);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        console.log('❌ Registro falhou - email já cadastrado:', userData.email);
        await storage.logAction(null, 'register_failed_email_exists', { 
          email: userData.email, 
          ip: clientIp,
          userAgent: req.headers['user-agent']
        });
        return res.status(400).json({ message: 'Este email já está cadastrado' });
      }

      // Additional validation for drivers
      if (userData.role === 'driver') {
        if (!userData.licensePlate?.trim()) {
          console.log('❌ Registro falhou - motorista sem placa');
          return res.status(400).json({ message: 'Placa do veículo é obrigatória para motoristas' });
        }
        
        // Check if license plate already exists
        const existingDriver = await storage.getDriverByLicensePlate(userData.licensePlate.trim());
        if (existingDriver) {
          console.log('❌ Registro falhou - placa já cadastrada:', userData.licensePlate);
          return res.status(400).json({ message: 'Esta placa já está cadastrada' });
        }
      }

      const result = await storage.register(userData);
      
      // Reset rate limit on successful registration
      security.resetRateLimit(rateLimitKey);
      
      console.log('✅ Registro realizado com sucesso para:', result.user.email, 'como', result.user.role);
      await storage.logAction(result.user.id, 'register_success', { 
        role: result.user.role, 
        ip: clientIp,
        userAgent: req.headers['user-agent']
      });
      
      res.json(result);
    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
      if (error.errors) {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message })) 
        });
      }
      res.status(400).json({ message: error.message || 'Erro ao registrar usuário' });
    }
  });

  app.get('/api/auth/me', authMiddleware, (req: any, res) => {
    try {
      console.log('👤 Solicitação de dados do usuário para:', req.user.email);
      res.json({ user: req.user });
    } catch (error) {
      console.error('❌ Erro ao buscar dados do usuário:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
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

  // Enhanced Admin routes (hidden)
  app.get('/api/admin-secret-2024/stats', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const stats = await storage.getSystemStats();
      
      // Calculate enhanced metrics
      const allRides = await storage.getAllRides();
      const todayRides = allRides.filter(ride => 
        ride.requestedAt ? new Date(ride.requestedAt).toDateString() === new Date().toDateString() : false
      );
      
      const totalRevenue = allRides.reduce((total, ride) => 
        ride.status === 'completed' ? total + (ride.finalPrice || ride.estimatedPrice) : total, 0
      );
      
      const completionRate = allRides.length ? 
        (allRides.filter(ride => ride.status === 'completed').length / allRides.length * 100) : 0;
      
      const enhancedStats = {
        ...stats,
        todayRides: todayRides.length,
        totalRevenue,
        completionRate: parseFloat(completionRate.toFixed(1))
      };
      
      res.json(enhancedStats);
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

  // Enhanced admin user management
  app.patch('/api/admin-secret-2024/users/:userId/:action', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const { userId, action } = req.params;
      const validActions = ['activate', 'deactivate'];
      
      if (!validActions.includes(action)) {
        return res.status(400).json({ message: 'Ação inválida' });
      }

      // Here you would implement user activation/deactivation logic
      console.log(`Admin ${req.user.email} realizou ação ${action} no usuário ${userId}`);
      await storage.logAction(req.user.id, `admin_user_${action}`, { targetUserId: userId });
      
      res.json({ message: `Usuário ${action === 'activate' ? 'ativado' : 'desativado'} com sucesso` });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao gerenciar usuário' });
    }
  });

  // Enhanced driver verification
  app.patch('/api/admin-secret-2024/drivers/:driverId/verify', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const { driverId } = req.params;
      const { verified } = req.body;
      
      const driver = await storage.updateDriver(driverId, { isVerified: verified });
      
      if (!driver) {
        return res.status(404).json({ message: 'Motorista não encontrado' });
      }

      console.log(`Admin ${req.user.email} ${verified ? 'verificou' : 'removeu verificação'} do motorista ${driverId}`);
      await storage.logAction(req.user.id, 'admin_driver_verify', { driverId, verified });
      
      res.json({ message: `Motorista ${verified ? 'verificado' : 'não verificado'} com sucesso`, driver });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao verificar motorista' });
    }
  });

  // System health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0'
    });
  });

  // Audit logs endpoint for admin
  app.get('/api/admin-secret-2024/audit-logs', authMiddleware, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      const logs = await storage.getAuditLogs(50); // Get last 50 logs
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar logs de auditoria' });
    }
  });

  return httpServer;
}
