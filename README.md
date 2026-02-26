# 🗳️ VotoRápido — Sistema de Conteo Electoral

Sistema de conteo rápido de votos para elecciones de autoridades locales y regionales.

## 🏗️ Arquitectura

```
voto-rapido/
├── backend/          # NestJS + PostgreSQL + TypeORM
│   ├── src/
│   │   ├── common/       # Guards, decorators, enums, base entity
│   │   ├── config/       # Configuración desacoplada (DB, JWT, App)
│   │   ├── modules/
│   │   │   ├── auth/         # JWT + Passport
│   │   │   ├── users/        # CRUD usuarios con roles
│   │   │   ├── parties/      # Partidos políticos
│   │   │   ├── tables/       # Mesas de votación
│   │   │   ├── election-types/ # Tipos: Gobernador, Alcalde, etc.
│   │   │   ├── votes/        # Reportes y entradas de voto
│   │   │   ├── reports/      # Exportación PDF/Excel
│   │   │   └── audit/        # Log de auditoría
│   │   └── database/     # Seed script
│   └── .env.example
├── frontend/         # React + TailwindCSS + TanStack Query
│   ├── src/
│   │   ├── lib/          # Cliente API (axios)
│   │   ├── store/        # Auth store (Zustand)
│   │   ├── components/   # Layout, CrudPage
│   │   └── pages/        # Login, Dashboard, Reports, CRUD pages
│   └── nginx.conf
└── docker-compose.yml
```

## 🚀 Inicio Rápido

### Opción A: Docker Compose (recomendado)

```bash
cd voto-rapido

# Copiar y configurar variables de entorno
cp backend/.env.example backend/.env

# Levantar servicios
docker-compose up -d

# Ejecutar seed de datos iniciales
docker-compose exec backend npm run seed
```

La aplicación estará disponible en `http://localhost`

### Opción B: Desarrollo local

**Requisitos:** Node.js 20+, PostgreSQL 15+

#### Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# Crear la base de datos
createdb voto_rapido

# Iniciar en modo desarrollo (auto-sync de schema)
npm run start:dev

# En otra terminal, sembrar datos de prueba
npm run seed
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 👤 Credenciales de Prueba

| Rol                   | Usuario             | Contraseña    |
| --------------------- | ------------------- | ------------- |
| Administrador         | `admin`             | `admin123`    |
| Jefe Campaña MPU      | `jefe_mpu`          | `jefe123`     |
| Jefe Campaña ADN      | `jefe_adn`          | `jefe123`     |
| Delegado MPU Mesa 001 | `delegado_mpu_M001` | `delegado123` |
| Delegado ADN Mesa 001 | `delegado_adn_M001` | `delegado123` |

## 📡 API

- Swagger UI: `http://localhost:3000/api/docs`
- Base URL: `http://localhost:3000/api/v1`

### Endpoints principales

| Método              | Ruta                        | Descripción            | Roles       |
| ------------------- | --------------------------- | ---------------------- | ----------- |
| POST                | `/auth/login`               | Iniciar sesión         | Público     |
| GET                 | `/votes/metrics`            | Métricas del dashboard | Todos       |
| GET                 | `/votes/reports`            | Listar reportes        | Todos       |
| POST                | `/votes/reports`            | Crear reporte          | DELEGADO    |
| PATCH               | `/votes/reports/:id/submit` | Enviar reporte         | DELEGADO    |
| PATCH               | `/votes/reports/:id/verify` | Verificar reporte      | ADMIN, JEFE |
| GET                 | `/reports/export/excel`     | Exportar Excel         | Todos       |
| GET                 | `/reports/export/pdf`       | Exportar PDF           | Todos       |
| GET/POST/PUT/DELETE | `/users`                    | CRUD usuarios          | ADMIN, JEFE |
| GET/POST/PUT/DELETE | `/parties`                  | CRUD partidos          | ADMIN       |
| GET/POST/PUT/DELETE | `/tables`                   | CRUD mesas             | ADMIN       |
| GET/POST/PUT/DELETE | `/election-types`           | CRUD tipos elección    | ADMIN       |

## 🔐 Seguridad y Roles

```
ADMIN
  ├── CRUD usuarios, partidos, mesas, tipos de elección
  ├── Ver/verificar todos los reportes
  └── Exportar reportes globales

JEFE_CAMPAÑA (por partido)
  ├── CRUD delegados de su partido
  ├── Ver reportes de sus delegados
  ├── Verificar reportes de sus delegados
  └── Exportar reportes de su partido

DELEGADO (por mesa)
  ├── Ingresar votos en su mesa asignada
  ├── Ver sus propios reportes
  └── Enviar reportes en borrador
```

## 📊 Modelo de Datos

```
User (ADMIN | JEFE_CAMPANA | DELEGADO)
  ├── Party (partido político)
  └── VotingTable (mesa asignada)

VoteReport (reporte por delegado/mesa)
  └── VoteEntry[] (votos por partido × tipo de elección)

ElectionType: Gobernador, Alcalde, Concejal, Asambleísta...
```

## 🔧 Variables de Entorno

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=voto_rapido

# JWT (cambiar en producción)
JWT_SECRET=cambia-este-secreto-en-produccion-min-32-chars
JWT_EXPIRATION=8h

# App
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

## 🔮 Extensiones Futuras

- **OCR de actas**: módulo para leer actas físicas con computer vision
- **WhatsApp Bot**: envío de resultados vía API de WhatsApp Business
- **WebSockets**: actualizaciones en tiempo real del dashboard
- **2FA**: autenticación de dos factores para delegados
- **Multi-elección**: soporte para múltiples procesos electorales paralelos
