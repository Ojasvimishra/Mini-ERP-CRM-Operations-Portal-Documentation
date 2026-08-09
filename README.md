# PROJECT HANDOVER & SUBMISSION DOSSIER
## Mini ERP + CRM Operations Portal

---

### 🌐 1. Live Deployment & Repository Links

* **GitHub Repository URL**: [https://github.com/Ojasvimishra/Mini-ERP-CRM-Operations-Portal-Documentation](https://github.com/Ojasvimishra/Mini-ERP-CRM-Operations-Portal-Documentation)
* **Live Frontend Dashboard (Vercel)**: [https://mini-erp-crm-operations-portal-docu.vercel.app/](https://mini-erp-crm-operations-portal-docu.vercel.app/)
* **Live Backend API Gateway (Render)**: [https://crm-backend-api-u0ak.onrender.com](https://crm-backend-api-u0ak.onrender.com)
* **Production Database Connection URL (Neon)**: 
  `postgresql://neondb_owner:npg_6xAYiSv7LpEd@ep-wandering-forest-azqhqsy4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

---

### 🔑 2. Test Login Credentials
*(All roles share the default password: **`password123`**)*

| Role | Email Credentials | Key Permissions |
| :--- | :--- | :--- |
| **Admin** | `admin@example.com` | Unlimited access (Client CRM, Catalog, Stock corrections, & Sales Challans) |
| **Sales** | `sales@example.com` | CRM (Add/Edit), Catalog views, Challan creation (Save/Confirm) |
| **Warehouse** | `warehouse@example.com` | View live stock, manually adjust quantities, confirm pending challans |
| **Accounts** | `accounts@example.com` | View customer portfolios and product catalog, cancel confirmed challans |

---

### 📐 3. System Architecture & Tech Stack

```mermaid
graph TD
    subgraph Client ["Client Layer (Vercel)"]
        React["React (Vite + TypeScript)"]
        CSS["Glassmorphism UI System"]
        PDF["jsPDF Exporter"]
    end

    subgraph Server ["Server Layer (Render)"]
        Express["Express.js (TypeScript)"]
        Prisma["Prisma ORM Client"]
    end

    subgraph Database ["Persistence Layer (Neon)"]
        Postgres["PostgreSQL DB Cluster"]
    end

    React -->|HTTP Requests with JWT Bearer| Express
    Express --> Prisma
    Prisma --> Postgres
```

#### Key Architecture Principles
* **Dynamic Role-Based Access Control (RBAC)**: The React client decodes the user's role payload from the signed JSON Web Token (JWT) at login to customize navigation views, tables, and button permissions.
* **Transactional Safety (ACID)**: Grid actions like stock confirmations (deductions) and cancellations (restorations) run under Prisma database transactions to guarantee stock consistency.
* **Historical Price Snapshots**: Challans capture the unit price and description of items at creation time, decoupling past invoice records from future catalog price edits.

---

### 📡 4. REST API Documentation

#### 🔐 Auth Endpoint (`/api/auth`)
* `POST /api/auth/login` - Validates credentials and returns JWT session token.
* `GET /api/auth/me` - Decodes active token and returns the current user profile.

#### 👥 Customer CRM (`/api/customers`)
* `GET /api/customers` - Returns client index list.
* `GET /api/customers/:id` - Returns single customer folder including follow-up history.
* `POST /api/customers` - Add a new customer record.
* `PUT /api/customers/:id` - Edit customer information.
* `POST /api/customers/:id/notes` - Append follow-up communication log.

#### 📦 Inventory (`/api/products`)
* `GET /api/products` - Returns catalog items, storage locations, and quantities.
* `GET /api/products/:id` - Fetch item details.
* `POST /api/products` - Create new product (Admin & Warehouse only).
* `PUT /api/products/:id` - Update catalog specifications (Admin & Warehouse only).
* `POST /api/products/:id/stock` - Post manual stock adjustments (IN/OUT) with change logs.

#### 🧾 Sales Challans (`/api/challans`)
* `GET /api/challans` - List all challans.
* `GET /api/challans/:id` - Fetch detailed challan including product snapshots.
* `POST /api/challans` - Save a draft challan.
* `POST /api/challans/:id/confirm` - Confirm challan (locks price and deducts stock under ACID transaction).
* `POST /api/challans/:id/cancel` - Cancel confirmed challan (restores stock).

---

### 🛠️ 5. Setup & Deployment Instructions

#### Local Setup
1. **Clone & Configure Backend**:
   * Navigate to `backend/` directory, create a `.env` file:
     ```env
     PORT=5000
     DATABASE_URL="postgresql://neondb_owner:npg_6xAYiSv7LpEd@ep-wandering-forest-azqhqsy4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
     JWT_SECRET="super-secret-key-change-in-production"
     ```
   * Install dependencies and run schema sync:
     ```bash
     npm install
     npx prisma db push
     npm run prisma:seed
     npm run dev
     ```
2. **Configure Frontend**:
   * Navigate to `frontend/` directory, install packages, and boot client:
     ```bash
     npm install
     npm run dev
     ```

#### Cloud Deployment
* **Backend (Render Web Service)**: Set root directory to `backend`. Set build command to `npm install && npm run build && npx prisma generate` and start command to `npx prisma db push && npm run prisma:seed && npm start`. Add env variables: `PORT=10000`, `DATABASE_URL` (Neon Connection), and `JWT_SECRET`. Set Health Check path to `/health`.
* **Frontend (Vercel Project)**: Connect GitHub, select root directory `frontend` and framework preset `Vite`. Set environment variable `VITE_API_URL` to `https://crm-backend-api-u0ak.onrender.com/api`.

---

### ⚠️ 6. Known Limitations
1. **User Management Screen**: The system lacks a frontend form to create user logins. New accounts must be created using Prisma Studio, SQL commands, or seed scripts.
2. **Render Cold Starts**: Because the backend is deployed on Render's free tier, the container spins down after 15 minutes of inactivity. The initial application load may take ~40 seconds while the web service wakes up.
