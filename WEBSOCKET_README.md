# 🛩️ OpenSky Flight Tracker - WebSocket Real-Time

## ⚡ Arquitetura Real-Time Implementada

```
OpenSky API → Laravel Job → Redis Cache → WebSocket (Reverb) → React (Real-time)
```

## 🚀 Como Usar o Sistema WebSocket

### 1. **Iniciar o WebSocket Server (Reverb)**

```bash
php artisan reverb:start
```

- Server roda em: `ws://localhost:8080`
- Console mostrará conexões ativas

### 2. **Iniciar Worker para Jobs**

```bash
php artisan queue:work --queue=flights
```

- Processa jobs de atualização de voos
- Necessário para funcionar o broadcast

### 3. **Iniciar Laravel App**

```bash
php artisan serve
```

- App roda em: `http://localhost:8000`

### 4. **Testando as Atualizações**

#### **Comando Manual (Terminal):**

```bash
php artisan flights:update --force
```

#### **Via API (Browser/Postman):**

```bash
POST http://localhost:8000/api/websocket/update-flights
```

#### **Aguardar Updates Automáticos:**

- Jobs são executados a cada 30 segundos automaticamente
- Configure em `routes/console.php`

## 📡 **Fluxo dos Dados**

1. **Job Dispatch** → `UpdateFlightsJob` busca dados da OpenSky API
2. **Redis Cache** → Dados são armazenados no Redis
3. **WebSocket Broadcast** → Event `FlightsUpdated` é transmitido
4. **React Frontend** → Hook `useWebSocket` recebe atualizações
5. **UI Update** → Mapa e estatísticas atualizam automaticamente

## 🛠️ **Componentes Implementados**

### **Backend:**

- ✅ `UpdateFlightsJob` - Job para buscar aviões
- ✅ `FlightsUpdated` - Event para broadcast
- ✅ `routes/channels.php` - Canais WebSocket
- ✅ `config/broadcasting.php` - Config Reverb
- ✅ Redis cache como store principal

### **Frontend:**

- ✅ `useWebSocket` hook - Gestão de conexão
- ✅ `websocket.js` service - Cliente Echo
- ✅ Dashboard com indicador live
- ✅ Auto-reconnect e error handling

## 🎛️ **Status da Conexão**

**Indicadores Visuais no Dashboard:**

- 🟢 **Live** - WebSocket conectado e funcionando
- 🟡 **Connecting** - Tentando conectar
- 🔴 **Offline** - Sem conexão

## ⚙️ **Configurações**

### **Environment (.env):**

```env
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=database  # Fallback sem Redis
CACHE_STORE=database       # Fallback sem Redis
REVERB_APP_ID=my-app
REVERB_APP_KEY=my-app-key
REVERB_APP_SECRET=my-app-secret
REVERB_HOST=localhost
REVERB_PORT=8080
```

### **Redis Optional (Performance):**

**Para instalar Redis (opcional):**

```bash
# Windows - via Chocolatey
choco install redis-64

# Windows - via winget
winget install Redis.Redis

# Ou baixar: https://github.com/microsoftarchive/redis/releases
```

**Após instalar Redis, altere .env:**

```env
QUEUE_CONNECTION=redis
CACHE_STORE=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## 🐛 **Debugging**

### **Verificar Status WebSocket:**

```bash
GET http://localhost:8000/api/websocket/status
```

### **Logs do Laravel:**

```bash
tail -f storage/logs/laravel.log
```

### **Console do Browser:**

- Mensagens de conexão WebSocket
- Updates de dados em tempo real

## 🎯 **Performance**

- **Máximo 50 aviões** por job para performance
- **Cache de 5 minutos** para evitar spam da API
- **Auto-reconnect** em caso de falha
- **Throttling** de 30s entre updates

## ⏰ **Próximos Passos**

1. **Redis Setup** - Configure Redis local se ainda não tiver
2. **Test WebSocket** - Verifique se `ws://localhost:8080` está acessível
3. **Monitor Jobs** - Use `php artisan horizon` para dashboard de jobs
4. **Scaling** - Configure multiple workers para alta demanda
