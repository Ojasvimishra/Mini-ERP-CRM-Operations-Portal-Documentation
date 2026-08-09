# Mini ERP + CRM Operations Portal

A modern, responsive, and robust Mini ERP + CRM Operations Portal built for wholesale/distribution businesses. The system supports role-based views for Admin, Sales, Warehouse, and Accounts teams.

---

## Technical Stack

- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL (Neon, Supabase, or Local Docker instance)
- **Frontend**: React (Vite + TypeScript), Modern Glassmorphic CSS System, Lucide Icons, jsPDF
- **DevOps**: Docker, Docker Compose

---

## Quick Start (Using Docker Compose)

The easiest way to boot the database, backend, and frontend together is via Docker Compose:

1. Make sure you have **Docker Desktop** installed.
2. Run the following command in the project root directory:
   ```bash
   docker-compose up --build
   ```
3. Once running:
   - **Frontend Dashboard**: Access at [http://localhost](http://localhost) (Port 80)
   - **Backend API**: Access at [http://localhost:5000](http://localhost:5000)
   - **PostgreSQL Database**: Accessible on host port `5435`

---

## Local Development (Without Docker Compose)

If you wish to run the database in docker and run application processes locally:

### Step 1: Start PostgreSQL Database
Spin up the PostgreSQL database container only:
```bash
docker-compose up -d db
```
The database will be exposed on localhost port **`5435`** (configured to avoid conflicting with default local PostgreSQL instances on port 5432).

### Step 2: Set Up Backend
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Push database schema & generate Prisma Client:
   ```bash
   npx prisma db push
   ```
4. Seed mock demo users and initial data:
   ```bash
   npm run prisma:seed
   ```
5. Start development API server:
   ```bash
   npm run dev
   ```
   The backend API will run on [http://localhost:5000](http://localhost:5000).

### Step 3: Set Up Frontend
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start React development server:
   ```bash
   npm run dev
   ```
   The frontend will run on [http://localhost:5173](http://localhost:5173).

---

## Demo Credentials (Password: `password123`)

| Role | Email | Permissions |
| :--- | :--- | :--- |
| **Admin** | `admin@example.com` | Complete access to CRM, Inventory, & Challans |
| **Sales** | `sales@example.com` | CRM (Add/Edit), Catalog views, Challan creation (Save/Confirm/Cancel) |
| **Warehouse** | `warehouse@example.com` | Stock level views, stock manual adjustments, Challan confirmation |
| **Accounts** | `accounts@example.com` | Customer/Product views, Challan cancellation |

---

## Business Logic & Constraints Implemented

1. **Auto-Numbering**: Challans automatically generate unique numbers using chronological format: `CH-YYYYMMDD-XXXX`.
2. **Transactional Safety**: Inventory checks and deductions run inside ACID transactions. Confirming a challan fails safely if stock is insufficient.
3. **Product Snapshots**: Challans capture the historical pricing and product description dynamically at creation time to prevent historical pricing changes from retroactively corrupting past invoice logs.
4. **Stock Movement Logs**: Every stock adjustment (manual IN/OUT corrections, initial setup, or sales deductions) logs an audited stock entry complete with supervisor attribution.
5. **PDF Invoicing**: Premium invoice exporter in the frontend using `jsPDF` allows instant receipt downloading.
