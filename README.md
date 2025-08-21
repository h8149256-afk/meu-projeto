# MindeloRide - Transporte Inteligente para Mindelo

Uma aplicação web completa tipo Uber para a cidade de Mindelo, Cabo Verde, com operação sem mapas, sistema de preços local e assinaturas para motoristas.

## 🚀 Características Principais

- **Três tipos de usuário**: Passageiro, Motorista e Admin
- **Operação sem mapas**: Sistema baseado em texto para origem/destino
- **Preços locais**: Tabela oficial de Mindelo em CVE (Escudos de Cabo Verde)
- **Sistema de assinatura**: 1º mês grátis para motoristas, depois 1.500 CVE/mês
- **Tempo real**: Atualizações via WebSocket para status das corridas
- **PWA**: Instalável como app móvel
- **Dark/Light mode**: Tema automático com cores do oceano e sol
- **Responsivo**: Design mobile-first

## 🛠️ Tecnologias Utilizadas

### Frontend
- React 18 com TypeScript
- Vite para build e desenvolvimento
- Tailwind CSS para estilização
- Shadcn/UI para componentes
- TanStack Query para gerenciamento de estado
- Wouter para roteamento
- Socket.io para WebSocket

### Backend
- Node.js com Express
- SQLite com Drizzle ORM
- JWT para autenticação
- WebSocket para tempo real
- Bcrypt para hash de senhas

### Configuração
- Arquivos JSON/CSV para preços e localizações
- Variáveis de ambiente (.env)
- Sistema de configuração por arquivos

## 📋 Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn
- VS Code (recomendado)

## 🔧 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone [url-do-repositorio]
cd mindeloride
