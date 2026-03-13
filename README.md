# ✈️ OpenSky Flight Tracker

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Inertia.js-2.0-9553E9?style=for-the-badge&logo=inertia&logoColor=white" alt="Inertia.js">
  <img src="https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind">
</p>

Um **sistema moderno de rastreamento de voos em tempo real** que utiliza dados da **OpenSky Network API** para mostrar a localização de aviões do mundo todo em um mapa interativo.

## ✨ Características Principais

🗺️ **Mapa Interativo Global** - Visualize voos em tempo real no mundo inteiro
⚛️ **Interface React Moderna** - SPA fluida com Inertia.js
📊 **Dashboard Dinâmico** - Estatísticas e métricas em tempo real
🔄 **Auto-Refresh** - Atualizações automáticas configuráveis
🌍 **Dados Reais** - Integração direta com OpenSky Network
📱 **Design Responsivo** - Funciona em desktop e mobile
✈️ **Marcadores Customizados** - Ícones de aviões no mapa

## 🚀 Demo Rápida

```bash
# Clone o projeto
git clone https://github.com/marceloaugst/FlightPath.git
cd openSky

# Instale as dependências
composer install
npm install

# Configure o ambiente
php artisan migrate
php artisan db:seed --class=TestFlightsSeeder

# Compile e execute
npm run build
php artisan serve
```

Acesse **http://localhost:8000** e veja os voos em tempo real! ✈️

## 📋 Pré-requisitos

- **PHP** 8.2+
- **Composer** 2.x
- **Node.js** 18+
- **Base de dados** (MySQL, SQLite, PostgreSQL)

## 🔧 Instalação Detalhada

### 1️⃣ Configurar Backend

```bash
# Instalar dependências PHP
composer install

# Criar arquivo .env
cp .env.example .env
php artisan key:generate

# Configurar base de dados no .env
# DB_CONNECTION=mysql (ou sqlite)
# DB_DATABASE=opensky
# DB_USERNAME=seu_usuario
# DB_PASSWORD=sua_senha
```

### 2️⃣ Configurar Frontend

```bash
# Instalar dependências Node.js
npm install

# Para desenvolvimento (opcional)
npm run dev
```

### 3️⃣ Configurar Base de Dados

```bash
# Executar migrações
php artisan migrate

# Popular com dados de teste
php artisan db:seed --class=TestFlightsSeeder
```

### 4️⃣ Executar Aplicação

```bash
# Compilar assets para produção
npm run build

# Iniciar servidor Laravel
php artisan serve
```

## 🎯 Como Usar

### Comandos Úteis

```bash
# Buscar voos reais da API OpenSky
php artisan flights:update

# Gerar voos de teste para demonstração
php artisan flights:test

# Desenvolvimento com watch mode
npm run dev
```

### Funcionalidades do Mapa

- **Zoom e Pan**: Navegue livremente pelo mapa
- **Clique em Aviões**: Veja detalhes do voo em popup
- **Auto-Fit**: O mapa ajusta automaticamente para mostrar todos os voos
- **Refresh**: Use o botão para atualizar dados manualmente

### Dashboard de Estatísticas

- **Total de Voos**: Contador em tempo real
- **Lista Detalhada**: Informações completas de cada voo
- **Países**: Origem dos voos ativos
- **Performance**: Tempo de resposta da API

## 🏗️ Tecnologias Utilizadas

### Backend

- **Laravel 12** - Framework PHP robusto
- **OpenSky Network API** - Dados reais de aviação
- **Eloquent ORM** - Modelagem de dados
- **Artisan Commands** - Automação de tarefas

### Frontend

- **React 19** - Interface de usuário moderna
- **Inertia.js 2.0** - SPA sem API
- **Leaflet** - Mapas interativos
- **React Leaflet** - Componentes React para mapas

### Estilização e Build

- **TailwindCSS 4** - Estilização utilitária
- **Vite 7** - Build system ultrarrápido
- **PostCSS** - Processamento de CSS

## 📊 Estrutura de Dados

Cada voo contém as seguintes informações:

```php
Flight {
    icao24: string,        // Identificador único do avião
    callsign: string,      // Código de voo (ex: "TAM3054")
    origin_country: string, // País de origem
    latitude: float,       // Coordenada latitude
    longitude: float,      // Coordenada longitude
    geometric_altitude: int, // Altitude em metros
    velocity: float,       // Velocidade em m/s
    true_track: float,     // Direção em graus
    time_position: int,    // Timestamp última posição
    last_contact: int      // Timestamp último contato
}
```

## 🗂️ Estrutura do Projeto

```
openSky/
├── app/
│   ├── Models/
│   │   └── Flight.php              # Modelo de voo com scopes
│   ├── Services/
│   │   └── OpenSkyService.php      # Integração API OpenSky
│   ├── Console/Commands/
│   │   └── UpdateFlights.php       # Comando atualização
│   └── Http/Controllers/
│       └── DashboardController.php # Controller Inertia
├── resources/js/
│   ├── Pages/
│   │   └── Dashboard.jsx           # Página principal
│   ├── Components/
│   │   └── FlightMap.jsx           # Componente mapa
│   └── Layouts/
│       └── Layout.jsx              # Layout padrão
├── database/
│   ├── migrations/
│   │   └── create_flights_table.php
│   └── seeders/
│       └── TestFlightsSeeder.php   # Dados de teste
```

## 🔄 Fluxo de Dados

1. **API OpenSky** → Dados brutos de voos globais
2. **OpenSkyService** → Processamento e validação
3. **Flight Model** → Armazenamento na base de dados
4. **DashboardController** → Envio para React
5. **FlightMap Component** → Renderização no mapa

## 🌐 API OpenSky Network

Este projeto utiliza a **API pública gratuita** da OpenSky Network:

- **Endpoint**: `https://opensky-network.org/api/states/all`
- **Dados**: Posições de aviões em tempo real
- **Cobertura**: Global, sem necessidade de autenticação
- **Limite**: Sem limitações para uso educacional

## 🚨 Solução de Problemas

### Erro "npm install"

```bash
# Use legacy peer deps para compatibilidade
npm install --legacy-peer-deps
```

### Base de dados não conecta

```bash
# Verifique configurações no .env
# Recrie a base se necessário
php artisan migrate:fresh --seed
```

### Assets não carregam

```bash
# Recompile os assets
npm run build
php artisan optimize:clear
```

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um **fork** do projeto
2. Crie uma **branch** para sua feature: `git checkout -b minha-feature`
3. Commit suas mudanças: `git commit -m 'Adiciona nova feature'`
4. Push para a branch: `git push origin minha-feature`
5. Abra um **Pull Request**

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

- **[OpenSky Network](https://opensky-network.org/)** - Dados gratuitos de aviação
- **[Laravel Team](https://laravel.com/)** - Framework excepcional
- **[React Team](https://react.dev/)** - Biblioteca revolucionária
- **[Leaflet](https://leafletjs.com/)** - Mapas open source fantásticos

---

<p align="center">
  Desenvolvido com ❤️ usando tecnologias modernas<br>
  <strong>Happy Coding! ✈️</strong>
</p>

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
