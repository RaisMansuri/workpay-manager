# 🏢 WorkPay Manager - Seva Kendra Management System

**WorkPay Manager** is a complete, full-stack web application designed for **Seva Kendra** (Citizen Service Centers) to manage customer service requests, track payment statuses, manage staff accounts, and streamline day-to-day operations with real-time database synchronization and automated notifications.

---

## 🌟 Key Features & Functionality

### 1. 🔐 Authentication & Role-Based Access Control (RBAC)
- **Dual Role Access**:
  - **Admin**: Full control over customer records, analytics, staff management, CSV exports, and account permissions.
  - **Staff**: Streamlined interface for adding customer service requests, checking status, and managing daily entries.
- **Supabase Auth Integration**: Secure password authentication with automatic session restoration.
- **Quick Demo Access**: Instant demo login option for quick evaluation:
  - **Admin Demo**: `admin@sevakendra.com` / `admin123`
  - **Staff Demo**: `staff@sevakendra.com` / `staff123`
- **Account Activation & Deactivation**: Admins can lock/deactivate staff accounts instantly, immediately blocking deactivated users from logging in.
- **Session & Audit Tracking**: Tracks `last_login_at` and `last_logout_at` timestamps for security audit trails.

---

### 2. 📋 Customer & Work Records Management (CRUD)
- **Create & Edit Entries**: Slide-out drawer form to record customer details without losing context of the table.
- **Captured Information**:
  - **Customer Details**: Name, Mobile Number, Locality / Address.
  - **Service Types**: Aadhaar Card, PAN Card, Ayushman Bharat, Ration Card, e-Shram Card, Passport, Voter ID, Utility Bills Payment, Banking / AEPS, Driving License, Other Services.
  - **Work Description**: Custom notes, application reference numbers, or requirements.
  - **Status Pipeline**: `Pending` ⏳, `In Progress` 🔄, `Completed` ✅, `Delivered` 📦, `Cancelled` ❌.
  - **Financial Billing**: Total Amount (₹), Paid Amount (₹), and Auto-Calculated Remaining Dues (₹).
- **Interactive Tooltips**: Hover/Click tooltips to view full work descriptions and location addresses directly from table rows.
- **Delete Protection**: Confirmation dialog before removing any customer record.
- **Detailed View Modal**: Comprehensive modal showing full customer history, contact shortcuts, and timeline logs.

---

### 3. 📊 Dashboard Analytics & Summary KPIs
- **Real-Time KPI Cards**:
  - **Total Customers Count**: Total service applications handled.
  - **Total Revenue / Billed Amount (₹)**: Aggregate value of all services.
  - **Total Amount Collected (₹)**: Realized cash/online payments received.
  - **Total Pending Dues (₹)**: Outstanding balance owed by customers.
  - **Today's New Entries**: Real-time count of customer applications created today.
  - **Status Distribution**: Live status pills displaying count of Pending, In Progress, Completed, Delivered, and Cancelled tasks.

---

### 4. 🔍 Advanced Search, Filtering, Sorting & Pagination
- **Global Instant Search**: Real-time filtering by Customer Name, Mobile Number, Address, Service Type, or Work Description.
- **Portal-Based Filter Popover**:
  - **Status Filter**: Filter by single or multiple work statuses.
  - **Service Category Filter**: Narrow down by specific government/private services.
  - **Date Filters**: Quick presets (`Today`, `Yesterday`, `Last 7 Days`, `Last 30 Days`) or custom date ranges (`From Date` - `To Date`).
- **Multi-Column Sorting**: Sort by Customer Name, Total Amount, Paid Amount, Remaining Balance, or Date Created.
- **Customizable Pagination**: Page navigation with selectable rows-per-page (10, 25, 50, 100).

---

### 5. 👥 Staff Management Portal (Admin Only)
- **Dedicated Management Tab**: `/admin/staff` portal for total staff oversight.
- **Staff Summary Cards**: Live counts of Total Staff, Active Users, and Inactive Accounts.
- **Staff Registration Modal**: Register new staff with Full Name, Email, Mobile Number, Password, and Role assignment.
- **One-Click Status Toggle**: Toggle staff status between `Active` and `Inactive`.
- **Staff Detail Modal**: View login history, assigned permissions, and user details.
- **Real-Time Sync**: Real-time update of staff list across active sessions.

---

### 6. 📱 Customer Notifications & Communication Services
- **SMS & WhatsApp Alerts**: Automatic notification dispatch (`smsService.js`) to customer mobile numbers upon entry creation/update.
- **Email Notifications**: Asynchronous email notifications (`emailService.js`) for application status updates.
- **Toast Alert System**: Floating notification toasts for immediate user action feedback.

---

### 7. 📥 Data Export & Report Generation
- **CSV Data Export**: One-click export of customer records into downloadable CSV (`seva_kendra_records_YYYY-MM-DD.csv`).
- **Print Formats**: Responsive layouts formatted for receipt printing and customer records documentation.

---

### 8. ⚡ Technology Stack & Cloud Infrastructure
- **Frontend**: React 19, Vite, Lucide Icons, Pure CSS Design System with CSS Variables & Glassmorphism UI.
- **Backend / Database**: Supabase PostgreSQL cloud database (`customer_records` and `profiles` tables).
- **Real-Time Database**: Supabase Realtime WebSocket subscriptions for live synchronization across devices.
- **Automated DB Migration**: Node.js migration script (`npm run db:migrate` / `node src/scripts/migrate.js`) to set up database schemas automatically.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation & Setup

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root directory (refer to `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Database Setup**:
   Run the migration script to set up tables in Supabase:
   ```bash
   npm run db:migrate
   ```
   *Or execute `supabase_schema.sql`, `supabase_auth_schema.sql`, and `supabase_staff_schema.sql` in the Supabase SQL Editor.*

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 📁 Project Structure

```
workpay-manager/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── CreateStaffModal.jsx     # Modal for creating new staff accounts
│   │   ├── CustomerDetailModal.jsx   # Detailed view modal for customer records
│   │   ├── CustomerForm.jsx          # Drawer form for adding/editing customer entries
│   │   ├── CustomerTable.jsx         # Main interactive table with search, filter, sort
│   │   ├── DeleteConfirmModal.jsx    # Modal for deletion confirmation
│   │   ├── LoginPage.jsx             # Auth login page with demo options
│   │   ├── Navbar.jsx                # Top navigation header with profile & actions
│   │   ├── StaffDashboard.jsx        # Staff user view
│   │   ├── StaffDetailModal.jsx       # Staff account details view
│   │   ├── StaffManagement.jsx       # Admin portal for managing staff members
│   │   ├── SummaryCards.jsx          # KPI analytics summary cards
│   │   └── Toast.jsx                 # Dynamic toast notification component
│   ├── config/
│   │   └── supabaseClient.js         # Supabase client configuration
│   ├── constants/
│   │   └── serviceTypes.js           # Services and status constants
│   ├── scripts/
│   │   └── migrate.js                # Database migration script
│   ├── services/
│   │   ├── authService.js            # Supabase Auth & Session management
│   │   ├── customerStorage.js        # Supabase PostgreSQL CRUD & Realtime DB
│   │   ├── emailService.js           # Async email notification service
│   │   ├── smsService.js             # Customer SMS & WhatsApp dispatch service
│   │   └── staffService.js           # Staff account CRUD & status management
│   ├── utils/
│   │   ├── formatters.js             # Currency, date, and phone formatting utilities
│   │   └── initialDemoData.js        # Initial seed demo data
│   ├── App.jsx                       # Main application router & state controller
│   ├── index.css                     # Core design system & theme styling
│   └── main.jsx                      # App entry point
├── supabase_schema.sql               # PostgreSQL schema for customer records
├── supabase_auth_schema.sql          # PostgreSQL schema for user profiles
├── supabase_staff_schema.sql         # PostgreSQL schema for staff & roles
├── package.json
└── vite.config.js
```
