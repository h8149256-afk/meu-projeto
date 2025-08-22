import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { 
  type User, 
  type Driver, 
  type Ride, 
  type Subscription,
  type InsertUser,
  type InsertDriver,
  type InsertRide,
  type InsertSubscription,
  type LoginData,
  type RegisterData,
  type UserWithDriver,
  type RideWithDetails
} from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "mindelo_ride_secret_key_2024_secure_" + Date.now();

export interface IStorage {
  // Auth methods
  login(credentials: LoginData): Promise<{ user: UserWithDriver; token: string } | null>;
  register(userData: RegisterData): Promise<{ user: UserWithDriver; token: string }>;
  getUserByToken(token: string): Promise<UserWithDriver | null>;
  
  // User methods
  getUser(id: string): Promise<UserWithDriver | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, data: Partial<User>): Promise<User | null>;
  
  // Driver methods
  getDriver(id: string): Promise<Driver | null>;
  getDriverByUserId(userId: string): Promise<Driver | null>;
  getDriverByLicensePlate(licensePlate: string): Promise<Driver | null>;
  createDriver(driverData: InsertDriver): Promise<Driver>;
  updateDriver(id: string, data: Partial<Driver>): Promise<Driver | null>;
  
  // Ride methods
  createRide(rideData: InsertRide): Promise<Ride>;
  getRide(id: string): Promise<RideWithDetails | null>;
  getRidesByPassenger(passengerId: string): Promise<RideWithDetails[]>;
  getRidesByDriver(driverId: string): Promise<RideWithDetails[]>;
  getPendingRides(): Promise<RideWithDetails[]>;
  updateRideStatus(id: string, status: Ride["status"], driverId?: string): Promise<Ride | null>;
  
  // Subscription methods
  getSubscriptionByDriverId(driverId: string): Promise<Subscription | null>;
  createSubscription(subscriptionData: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription | null>;
  
  // Favorites methods
  addFavorite(passengerId: string, driverId: string): Promise<void>;
  removeFavorite(passengerId: string, driverId: string): Promise<void>;
  getFavoritesByPassenger(passengerId: string): Promise<Driver[]>;
  
  // Admin methods
  getAllUsers(): Promise<UserWithDriver[]>;
  getAllRides(): Promise<RideWithDetails[]>;
  getSystemStats(): Promise<any>;
  
  // Audit log
  logAction(userId: string | null, action: string, details?: any): Promise<void>;
}

export class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private drivers: Map<string, Driver> = new Map();
  private rides: Map<string, Ride> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private favorites: Map<string, Set<string>> = new Map(); // passengerId -> Set of driverIds
  private auditLogs: Array<{ id: string; userId: string | null; action: string; timestamp: Date; details?: any }> = [];
  
  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Create admin user
    const adminId = "admin-001";
    this.users.set(adminId, {
      id: adminId,
      email: "admin@mindeloride.cv",
      password: bcrypt.hashSync("MindeloAdmin2024!", 10),
      name: "Admin Sistema",
      phone: "+238 555-0000",
      role: "admin",
      createdAt: new Date()
    });

    // Create sample passenger
    const passengerId = "passenger-001";
    this.users.set(passengerId, {
      id: passengerId,
      email: "joao@email.cv",
      password: bcrypt.hashSync("123456", 10),
      name: "João Silva",
      phone: "+238 555-1111",
      role: "passenger",
      createdAt: new Date()
    });

    // Create sample driver
    const driverId = "driver-001";
    const driverUserId = "driver-user-001";
    this.users.set(driverUserId, {
      id: driverUserId,
      email: "manuel@email.cv",
      password: bcrypt.hashSync("123456", 10),
      name: "Manuel Santos",
      phone: "+238 555-2222",
      role: "driver",
      createdAt: new Date()
    });

    this.drivers.set(driverId, {
      id: driverId,
      userId: driverUserId,
      licensePlate: "CV-01-AB-123",
      vehicleModel: "Toyota Corolla",
      isVerified: true,
      rating: 4.8,
      totalRides: 150
    });

    // Create trial subscription for driver
    const subscriptionId = "sub-001";
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
    
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      driverId: driverId,
      status: "trial",
      trialEndsAt: trialEndsAt,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
      monthlyFee: 1500
    });
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  async login(credentials: LoginData): Promise<{ user: UserWithDriver; token: string } | null> {
    const user = Array.from(this.users.values()).find(u => u.email === credentials.email);
    if (!user || !await bcrypt.compare(credentials.password, user.password)) {
      return null;
    }

    const userWithDriver = await this.getUserWithDriver(user.id);
    if (!userWithDriver) return null;

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    await this.logAction(user.id, 'login');
    return { user: userWithDriver, token };
  }

  async register(userData: RegisterData): Promise<{ user: UserWithDriver; token: string }> {
    // Additional validation
    if (!userData.email?.trim()) {
      throw new Error('Email é obrigatório');
    }
    if (!userData.password || userData.password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }
    if (!userData.name?.trim()) {
      throw new Error('Nome é obrigatório');
    }
    
    const hashedPassword = await bcrypt.hash(userData.password, 12); // Increased salt rounds
    const userId = this.generateId();
    
    const newUser: User = {
      id: userId,
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      phone: userData.phone || null,
      role: userData.role as "passenger" | "driver" | "admin",
      createdAt: new Date()
    };

    this.users.set(userId, newUser);

    if (userData.role === 'driver' && userData.licensePlate) {
      if (!userData.licensePlate.trim()) {
        throw new Error('Placa do veículo é obrigatória para motoristas');
      }
      
      const driverId = this.generateId();
      const driver: Driver = {
        id: driverId,
        userId: userId,
        licensePlate: userData.licensePlate.trim().toUpperCase(),
        vehicleModel: userData.vehicleModel?.trim() || null,
        isVerified: false,
        rating: null,
        totalRides: 0
      };

      this.drivers.set(driverId, driver);

      // Create trial subscription
      const trialEndsAt = new Date();
      trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
      
      const subscriptionId = this.generateId();
      const subscription: Subscription = {
        id: subscriptionId,
        driverId: driverId,
        status: 'trial',
        trialEndsAt: trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
        monthlyFee: 1500
      };

      this.subscriptions.set(subscriptionId, subscription);
    }

    const userWithDriver = await this.getUserWithDriver(userId);
    if (!userWithDriver) throw new Error('Failed to create user');

    const token = jwt.sign({ userId: userId, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    
    await this.logAction(userId, 'register');
    return { user: userWithDriver, token };
  }

  async getUserByToken(token: string): Promise<UserWithDriver | null> {
    try {
      if (!token?.trim()) {
        return null;
      }
      
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      
      if (!decoded.userId) {
        return null;
      }
      
      const user = await this.getUserWithDriver(decoded.userId);
      
      // Verify user still exists and role matches
      if (!user || user.role !== decoded.role) {
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return null;
    }
  }

  private async getUserWithDriver(userId: string): Promise<UserWithDriver | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    let driver = null;
    let subscription = null;
    
    if (user.role === 'driver') {
      // Find driver by userId
      driver = Array.from(this.drivers.values()).find(d => d.userId === userId) || null;
      if (driver) {
        // Find subscription by driverId
        subscription = Array.from(this.subscriptions.values()).find(s => s.driverId === driver!.id) || null;
      }
    }

    return { ...user, driver: driver || undefined, subscription: subscription || undefined };
  }

  async getUser(id: string): Promise<UserWithDriver | null> {
    return await this.getUserWithDriver(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.email === email) || null;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getDriver(id: string): Promise<Driver | null> {
    return this.drivers.get(id) || null;
  }

  async getDriverByUserId(userId: string): Promise<Driver | null> {
    return Array.from(this.drivers.values()).find(d => d.userId === userId) || null;
  }

  async getDriverByLicensePlate(licensePlate: string): Promise<Driver | null> {
    const normalizedPlate = licensePlate.trim().toUpperCase();
    return Array.from(this.drivers.values()).find(d => 
      d.licensePlate.trim().toUpperCase() === normalizedPlate
    ) || null;
  }

  async createDriver(driverData: InsertDriver): Promise<Driver> {
    const id = this.generateId();
    const driver: Driver = {
      id,
      userId: driverData.userId,
      licensePlate: driverData.licensePlate,
      vehicleModel: driverData.vehicleModel || null,
      isVerified: false,
      rating: null,
      totalRides: 0
    };
    this.drivers.set(id, driver);
    return driver;
  }

  async updateDriver(id: string, data: Partial<Driver>): Promise<Driver | null> {
    const driver = this.drivers.get(id);
    if (!driver) return null;
    
    const updatedDriver = { ...driver, ...data };
    this.drivers.set(id, updatedDriver);
    return updatedDriver;
  }

  async createRide(rideData: InsertRide): Promise<Ride> {
    const id = this.generateId();
    const ride: Ride = {
      id,
      passengerId: rideData.passengerId,
      driverId: rideData.driverId || null,
      origin: rideData.origin,
      destination: rideData.destination,
      passengerPhone: rideData.passengerPhone,
      notes: rideData.notes || null,
      estimatedPrice: rideData.estimatedPrice,
      finalPrice: rideData.finalPrice || null,
      distance: rideData.distance || null,
      status: 'pending',
      requestedAt: new Date(),
      acceptedAt: null,
      startedAt: null,
      completedAt: null
    };
    this.rides.set(id, ride);
    await this.logAction(rideData.passengerId, 'ride_requested', { rideId: id });
    return ride;
  }

  async getRide(id: string): Promise<RideWithDetails | null> {
    const ride = this.rides.get(id);
    if (!ride) return null;

    const passenger = this.users.get(ride.passengerId);
    let driver = null;
    
    if (ride.driverId) {
      const driverRecord = this.drivers.get(ride.driverId);
      if (driverRecord) {
        const driverUser = this.users.get(driverRecord.userId);
        driver = { ...driverRecord, user: driverUser };
      }
    }

    return { ...ride, passenger, driver: driver || undefined };
  }

  async getRidesByPassenger(passengerId: string): Promise<RideWithDetails[]> {
    const ridesList = Array.from(this.rides.values())
      .filter(ride => ride.passengerId === passengerId)
      .sort((a, b) => (b.requestedAt?.getTime() || 0) - (a.requestedAt?.getTime() || 0));

    const results = await Promise.all(ridesList.map(ride => this.getRide(ride.id)));
    return results.filter(r => r !== null) as RideWithDetails[];
  }

  async getRidesByDriver(driverId: string): Promise<RideWithDetails[]> {
    const ridesList = Array.from(this.rides.values())
      .filter(ride => ride.driverId === driverId)
      .sort((a, b) => (b.requestedAt?.getTime() || 0) - (a.requestedAt?.getTime() || 0));

    const results = await Promise.all(ridesList.map(ride => this.getRide(ride.id)));
    return results.filter(r => r !== null) as RideWithDetails[];
  }

  async getPendingRides(): Promise<RideWithDetails[]> {
    const ridesList = Array.from(this.rides.values())
      .filter(ride => ride.status === 'pending')
      .sort((a, b) => (b.requestedAt?.getTime() || 0) - (a.requestedAt?.getTime() || 0));

    const results = await Promise.all(ridesList.map(ride => this.getRide(ride.id)));
    return results.filter(r => r !== null) as RideWithDetails[];
  }

  async updateRideStatus(id: string, status: Ride["status"], driverId?: string): Promise<Ride | null> {
    const ride = this.rides.get(id);
    if (!ride) return null;

    const now = new Date();
    const updatedRide = { ...ride, status };

    if (status === 'accepted' && driverId) {
      updatedRide.driverId = driverId;
      updatedRide.acceptedAt = now;
    } else if (status === 'started') {
      updatedRide.startedAt = now;
    } else if (status === 'completed') {
      updatedRide.completedAt = now;
    }

    this.rides.set(id, updatedRide);
    await this.logAction(driverId || null, `ride_${status}`, { rideId: id });
    return updatedRide;
  }

  async getSubscriptionByDriverId(driverId: string): Promise<Subscription | null> {
    return Array.from(this.subscriptions.values()).find(s => s.driverId === driverId) || null;
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const id = this.generateId();
    const subscription: Subscription = {
      id,
      driverId: subscriptionData.driverId,
      status: subscriptionData.status || 'trial',
      trialEndsAt: subscriptionData.trialEndsAt || null,
      currentPeriodStart: subscriptionData.currentPeriodStart || null,
      currentPeriodEnd: subscriptionData.currentPeriodEnd || null,
      monthlyFee: subscriptionData.monthlyFee || 1500
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription | null> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return null;
    
    const updatedSubscription = { ...subscription, ...data };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async addFavorite(passengerId: string, driverId: string): Promise<void> {
    if (!this.favorites.has(passengerId)) {
      this.favorites.set(passengerId, new Set());
    }
    this.favorites.get(passengerId)!.add(driverId);
    await this.logAction(passengerId, 'driver_favorited', { driverId });
  }

  async removeFavorite(passengerId: string, driverId: string): Promise<void> {
    const passengerFavorites = this.favorites.get(passengerId);
    if (passengerFavorites) {
      passengerFavorites.delete(driverId);
    }
    await this.logAction(passengerId, 'driver_unfavorited', { driverId });
  }

  async getFavoritesByPassenger(passengerId: string): Promise<Driver[]> {
    const favoriteDriverIds = this.favorites.get(passengerId);
    if (!favoriteDriverIds) return [];

    const favoriteDrivers: Driver[] = [];
    for (const driverId of Array.from(favoriteDriverIds)) {
      const driver = this.drivers.get(driverId);
      if (driver) {
        favoriteDrivers.push(driver);
      }
    }
    return favoriteDrivers;
  }

  async getAllUsers(): Promise<UserWithDriver[]> {
    const allUsers = Array.from(this.users.values());
    const results = await Promise.all(allUsers.map(user => this.getUserWithDriver(user.id)));
    return results.filter(u => u !== null) as UserWithDriver[];
  }

  async getAllRides(): Promise<RideWithDetails[]> {
    const allRides = Array.from(this.rides.values())
      .sort((a, b) => (b.requestedAt?.getTime() || 0) - (a.requestedAt?.getTime() || 0));
    const results = await Promise.all(allRides.map(ride => this.getRide(ride.id)));
    return results.filter(r => r !== null) as RideWithDetails[];
  }

  async getSystemStats(): Promise<any> {
    const totalUsers = this.users.size;
    const totalDrivers = this.drivers.size;
    const totalRides = this.rides.size;
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(s => s.status === 'active').length;

    return {
      totalUsers,
      totalDrivers,
      totalRides,
      activeSubscriptions,
    };
  }

  async logAction(userId: string | null, action: string, details?: any): Promise<void> {
    const logEntry = {
      id: this.generateId(),
      userId,
      action,
      timestamp: new Date(),
      details
    };
    this.auditLogs.push(logEntry);
  }
}

export const storage = new MemoryStorage();
