# 🛫 OpenSky Flight Tracker

Um sistema de rastreamento de voos em tempo real usando dados da **OpenSky Network API**, construído com **Laravel**, **React**, **Inertia.js** e **Leaflet**.

## ✨ Características

- 🗺️ **Mapa interativo** com Leaflet mostrando voos em tempo real
- ⚛️ **Frontend React** com Inertia.js para uma SPA fluida
- 📊 **Dashboard** com estatísticas de voos
- 🔄 **Auto-refresh** configurável para dados em tempo real
- 🌍 **Dados globais** da OpenSky Network API
- 📱 **Design responsivo** com TailwindCSS

## 🚀 Primeiros Passos

### 1. Instalar dependências

```bash
# Dependências PHP
composer install

# Dependências JavaScript
npm install --legacy-peer-deps
```

### 2. Configurar ambiente

```bash
# Configurar banco de dados
php artisan migrate

# Criar dados de teste
php artisan db:seed --class=TestFlightsSeeder
```

### 3. Executar aplicação

```bash
# Compilar assets
npm run build

# Iniciar servidor
php artisan serve
```

Acesse: **http://localhost:8000**

## 📋 Comandos Úteis

```bash
# Buscar voos da API OpenSky
php artisan flights:update

# Criar voos de teste
php artisan flights:test

# Desenvolvimento frontend
npm run dev
```

## 🏗️ Stack Tecnológico

- **Backend**: Laravel 12, PHP 8.2+
- **Frontend**: React 19, Inertia.js
- **Mapas**: Leaflet, React Leaflet
- **Styling**: TailwindCSS 4
- **Build**: Vite 7

## 🔧 Funcionalidades

### Mapa Interativo

- Visualização global de voos em tempo real
- Marcadores personalizados em formato de avião
- Popups com detalhes de cada voo
- Auto-zoom para enquadrar todos os voos

### Dashboard

- Estatísticas em tempo real
- Auto-refresh configurável
- Lista detalhada de voos
- Design responsivo

### API OpenSky Integration

- Processamento inteligente de dados
- Validação e limpeza automática
- Cache local para performance
- Tratamento robusto de erros

## 📊 Dados dos Voos

Cada voo exibe:

- **Callsign** e identificador ICAO24
- **País de origem**
- **Coordenadas** atuais (latitude/longitude)
- **Altitude** e velocidade
- **Timestamp** do último contato

## 🗃️ Estrutura

```
├── app/
│   ├── Models/Flight.php           # Modelo de voo
│   ├── Services/OpenSkyService.php # Integração API
│   └── Console/Commands/          # Comandos Artisan
├── resources/js/
│   ├── Pages/Dashboard.jsx        # Página principal
│   ├── Components/FlightMap.jsx   # Componente mapa
│   └── Layouts/Layout.jsx         # Layout base
└── database/
    └── migrations/               # Estrutura do banco
```

---

🔥 **Sistema completo de rastreamento de voos com React, Inertia.js e Leaflet!**
