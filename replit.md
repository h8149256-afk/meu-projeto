# Mindelo Taxi App - Uber-like Transportation for Cape Verde

## Project Overview
A comprehensive Uber-like transportation web app for Mindelo, Cape Verde featuring:
- Map-less operation with location-based pricing
- Three user types: Passenger, Driver, Admin
- Local pricing in CVE (Cape Verde Escudo)
- Driver subscription model (1st month free, then 1,500 CVE/month)
- Real-time ride matching and status updates
- PWA capabilities for mobile use
- Local hosting on laptop

## User Preferences
- Language: Portuguese as primary (PT)
- Currency: CVE (Cape Verde Escudo)
- Timezone: Atlantic/Cape_Verde
- UI: Modern, clean design with glassmorphism
- Theme: Light/dark mode with ocean blue, sun yellow, and neutral colors
- Mobile-first responsive design

## Project Architecture

### Frontend (React + Vite)
- Pages: Home/Landing, Passenger Dashboard, Driver Dashboard, Admin (hidden)
- Components: Shared UI components using shadcn/ui
- Routing: Wouter for client-side routing
- State: TanStack Query for server state
- Styling: Tailwind CSS with custom CVE theme

### Backend (Express)
- API routes for rides, users, subscriptions, pricing
- WebSocket/SSE for real-time updates
- JWT authentication with refresh tokens
- Role-based access control (passenger, driver, admin)

### Database (SQLite)
- Users, rides, subscriptions, favorites, audit logs
- Drizzle ORM for type-safe database operations
- Local SQLite file for easy deployment

### Configuration Files
- `config/prices.json` - Pricing rules and zones
- `config/places.csv` - Local areas/neighborhoods for autocomplete
- `config/holidays.csv` - Local holidays affecting pricing
- `.env` - Environment variables and secrets

## Key Features
1. **Passenger Flow**: Request ride without map → Calculate price → Call taxi → Real-time updates
2. **Driver Flow**: Receive requests → Accept/Decline → Start/Finish ride → Subscription management
3. **Admin Panel**: Hidden interface for system management, pricing, user control
4. **Pricing Engine**: Zone-based pricing with time multipliers (day/night/weekend)
5. **Subscription System**: Driver monthly fees with trial period
6. **Favorites**: Passengers can favorite preferred drivers
7. **Real-time Updates**: WebSocket for live ride status updates

## Recent Changes
- Initial project setup
- Basic architecture planning

## Next Steps
- Create landing/home page
- Implement user authentication
- Build passenger and driver interfaces
- Set up pricing calculation system
- Implement real-time ride matching