# App PTAR — Guía de Configuración para Colaboradores

Bienvenida Luna 👋. Este documento te explica cómo configurar el proyecto desde cero en tu PC, cómo conectarte a la base de datos y cómo trabajar con Git día a día.

---

## ¿Qué es este proyecto?

Sistema web para monitoreo de la Planta de Tratamiento de Agua Residual (PTAR 2) de PERMODA. Tiene dos partes:

| Parte | Tecnología | Puerto local |
|---|---|---|
| **Backend** (API + informes) | Python · FastAPI · MySQL | `http://localhost:8001` |
| **Frontend** (interfaz web) | React · TypeScript · Vite | `http://localhost:5174` |

---

## Requisitos previos

Instala esto antes de empezar (si aún no lo tienes):

- **Git**: https://git-scm.com/download/win
- **Python 3.12**: https://www.python.org/downloads/ _(marcar "Add to PATH" al instalar)_
- **Node.js 20+**: https://nodejs.org/
- **MySQL 8**: https://dev.mysql.com/downloads/mysql/ _(o MySQL Workbench que lo incluye)_
- **VS Code**: https://code.visualstudio.com/ _(recomendado)_

---

## Paso 1 — Clonar el repositorio

Abre una terminal (PowerShell o CMD) y ejecuta:

```bash
git clone https://github.com/davidan11-ing/ptar-permoda.git
cd ptar-permoda
```

---

## Paso 2 — Configurar el Backend

### 2.1 Crear el entorno virtual de Python

```bash
cd ptar-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2.2 Crear tu archivo de variables de entorno

```bash
copy .env.example .env
```

Abre `.env` con cualquier editor y completa con tus datos de MySQL:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ptar_permoda
DB_USER=root
DB_PASS=TU_CONTRASEÑA_MYSQL
APP_HOST=0.0.0.0
APP_PORT=8001
CORS_ORIGIN=http://localhost:5174
```

> ⚠️ **Este archivo `.env` nunca se sube a GitHub** — es solo tuyo y tiene tus credenciales locales.

### 2.3 Crear la base de datos local

Abre **MySQL Workbench** (o cualquier cliente MySQL) y ejecuta en orden:

```sql
-- 1. Crear la base de datos
CREATE DATABASE ptar_permoda CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Cargar el esquema completo
SOURCE C:/ruta/donde/clonaste/ptar-permoda/ptar-backend/db/01_schema.sql;
```

O desde la terminal:

```bash
mysql -u root -p -e "CREATE DATABASE ptar_permoda CHARACTER SET utf8mb4;"
mysql -u root -p ptar_permoda < ptar-backend/db/01_schema.sql
```

> 💡 La base de datos empieza vacía. Los datos de producción están en el servidor de PERMODA. Para desarrollo puedes ingresar datos de prueba desde la app.

### 2.4 Verificar que el backend funciona

```bash
# Desde la carpeta ptar-backend, con el .venv activado:
uvicorn app.main:app --reload --port 8001
```

Abre `http://localhost:8001/api/health` en el navegador. Debe responder:
```json
{"status": "ok"}
```

---

## Paso 3 — Configurar el Frontend

Abre una **segunda terminal** (deja el backend corriendo en la primera):

```bash
cd ptar-app
npm install
```

Crea el archivo de configuración de desarrollo:

```bash
# Crear el archivo .env.development
echo VITE_API_URL=http://localhost:8001 > .env.development
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre `http://localhost:5174` en el navegador. Deberías ver la pantalla de login de la PTAR.

---

## Paso 4 — Flujo de trabajo con Git

### Al empezar a trabajar cada día

```bash
git pull
```

Esto descarga los cambios que haya hecho Daniela mientras tanto.

### Mientras trabajas

Edita los archivos normalmente en VS Code. Cuando termines un bloque de cambios:

```bash
git add .
git commit -m "descripción breve de lo que hiciste"
git push
```

### Ejemplos de mensajes de commit

```bash
git commit -m "fix: corregir cálculo de eficiencia en dashboard"
git commit -m "feat: agregar gráfica de tendencia en informe calidad"
git commit -m "style: ajustar colores de la tabla de reactivos"
```

### Si hay un conflicto

Cuando dos personas editan la misma línea del mismo archivo, Git avisa:

```
CONFLICT (content): Merge conflict in ptar-backend/app/routes/reportes.py
```

Abre el archivo en VS Code — verás botones para elegir qué versión queda:
- **Accept Current Change** → queda tu versión
- **Accept Incoming Change** → queda la versión de Daniela
- **Accept Both Changes** → quedan las dos

Después de resolver:
```bash
git add .
git commit -m "merge: resolver conflicto en reportes.py"
git push
```

---

## Estructura del proyecto

```
ptar-permoda/
├── ptar-backend/           ← API Python (FastAPI)
│   ├── app/
│   │   ├── main.py         ← punto de entrada, configura FastAPI
│   │   ├── config.py       ← lee variables del .env
│   │   ├── database.py     ← conexión a MySQL
│   │   └── routes/
│   │       ├── caudales.py     ← lecturas de contadores
│   │       ├── reactivos.py    ← reactivos químicos
│   │       ├── calidad.py      ← calidad del agua
│   │       ├── dashboard.py    ← KPIs del dashboard
│   │       └── reportes.py     ← informes HTML y PDF
│   ├── db/
│   │   └── 01_schema.sql   ← esquema completo de MySQL
│   ├── .env.example        ← plantilla de variables (sin contraseñas)
│   └── requirements.txt    ← dependencias Python
│
├── ptar-app/               ← Interfaz web (React)
│   ├── src/
│   │   ├── features/       ← pantallas de la app
│   │   │   ├── dashboard/  ← KPI Dashboard
│   │   │   ├── calidad/    ← análisis de calidad del agua
│   │   │   └── operario/   ← formularios de registro
│   │   └── services/
│   │       └── ptarClient.ts  ← todas las llamadas al backend
│   └── package.json
│
├── sql/                    ← vistas y scripts SQL adicionales
└── scripts/                ← scripts de carga de datos desde Excel
```

---

## Comandos de referencia rápida

| Qué hacer | Comando |
|---|---|
| Descargar cambios del repo | `git pull` |
| Ver qué archivos cambiaste | `git status` |
| Subir tus cambios | `git add . && git commit -m "mensaje" && git push` |
| Ver historial de commits | `git log --oneline` |
| Activar entorno Python | `.venv\Scripts\activate` |
| Iniciar backend | `uvicorn app.main:app --reload --port 8001` |
| Iniciar frontend | `npm run dev` |

---

## Contacto

Cualquier duda con la configuración: **Daniela** — davidan@permoda.com.co
