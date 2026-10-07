# Priya Dream Kitchen — Billing & Invoice Web App

A clean, mobile-first billing and invoicing system custom-built for **Priya Dream Kitchen** (Sri Lankan Cooking Class, Weligama, Sri Lanka).

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (Database & Auth)**.

---

## ✨ Features

- **Authentication (Supabase Auth)**:
  - Secure email + password authentication (no public sign-up).
  - Protected routes via Next.js App Router Middleware with `@supabase/ssr` cookies.
  - Mobile-friendly session persistence with one-click logout.
- **New Invoice Form**:
  - Customer information: Name, Country (searchable dropdown), WhatsApp/Phone, Guest count, Booking date & time.
  - Cooking class line items with quick-add presets (`Rice + 7 Curries`, `Chicken Kottu Class`, `Extra Guest`) and custom items.
  - Automatic calculations for subtotals, discounts (fixed `$` or percentage `%` toggle), and grand totals.
  - Payment details (Cash, Bank Transfer, Online) and status (`Paid` / `Pending`).
- **A4-Proportioned Invoice Preview**:
  - Matches official print dimensions (210mm × 297mm) with razor-sharp typography.
  - Checkbox indicators (`☑` / `☐`) for payment methods and statuses.
  - **High-DPI PDF Export**: Captures at 240+ DPI without text clipping; names files automatically as `PDK-0001_CustomerName.pdf`.
  - **Share on WhatsApp**: Opens `wa.me` with a pre-filled invoice summary reminding staff to attach the PDF.
  - **Print Ready**: Direct browser print styles (`@page { size: A4 portrait; margin: 10mm; }`).
- **Invoice History & Management**:
  - Tabular list sorted newest first.
  - Live search by customer name or invoice number.
  - Status filter (`All`, `Paid`, `Pending`).
  - Pagination (20 invoices per page).
  - Actions: Open, Edit, Duplicate (clones items with new invoice number), Quick "✓ Mark as Paid", and Delete (with confirmation modal).
  - **Export CSV**: One-click download of all invoices for monthly bookkeeping.
- **Settings & Presets**:
  - Live editing of business WhatsApp number, invoice prefix (`PDK`), currency symbol (`$`), and cooking class preset names/prices.
  - Stored directly in Supabase `settings` table with atomic sequence numbering.

---

## 🚀 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
> *Find these in your Supabase Dashboard under **Project Settings** → **API**.*

### 3. Run Database Schema in Supabase
1. Open your Supabase Dashboard.
2. Go to **SQL Editor** → **New Query**.
3. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql).
4. Click **Run**. This creates:
   - `invoices` table
   - `settings` table (seeded with initial business settings)
   - `next_invoice_no()` atomic numbering function
   - Row Level Security (RLS) policies

### 4. Create Your Admin User in Supabase
Since public sign-up is disabled for security:
1. In Supabase Dashboard, navigate to **Authentication** → **Users**.
2. Click **Add user** → **Create user**.
3. Enter your email and password, then check **Auto Confirm User** (or verify via email).
4. Use these credentials to sign in at `/login`.

### 5. Run the Local Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Netlify Deployment Guide

This repository is fully configured for continuous deployment on Netlify using the Next.js runtime plugin.

### Step 1: Push Code to GitHub / GitLab
Commit and push your project to your Git repository:
```bash
git add .
git commit -m "Add authentication and production polish"
git push
```

### Step 2: Import Project in Netlify
1. Log in to [Netlify](https://app.netlify.com/).
2. Click **Add new site** → **Import an existing project**.
3. Authorize GitHub and choose your `Kitchen Bill` repository.

### Step 3: Build & Runtime Configuration
Netlify automatically reads our [`netlify.toml`](netlify.toml) file, but verify these settings in the UI:
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Next.js Runtime Plugin**: The official `@netlify/plugin-nextjs` is already installed in `netlify.toml`:
  ```toml
  [build]
    command = "npm run build"
    publish = ".next"

  [[plugins]]
    package = "@netlify/plugin-nextjs"
  ```
  *(Netlify automatically installs and runs this plugin during build for full App Router SSR, middleware, and cookie support).*

### Step 4: Add the Environment Variables in Netlify
Before deploying, add your Supabase credentials:
1. In your Netlify site dashboard, navigate to:
   **Site configuration** → **Environment variables**.
2. Click **Add a variable** → **Add a single variable** and set:
   - **Key**: `NEXT_PUBLIC_SUPABASE_URL`  
     **Value**: `https://your-project-id.supabase.co` (from your Supabase Dashboard)
3. Click **Add another variable** and set:
   - **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
     **Value**: Your Supabase `anon` public key (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
4. Click **Create variable** to save.

### Step 5: Deploy Site
1. Click **Deploy site**.
2. Netlify will run `npm run build`, bundle the Next.js SSR functions via `@netlify/plugin-nextjs`, and provision your production URL (e.g. `https://priyadreamkitchen.netlify.app`).
3. You can set up your custom domain under **Domain management**.

---

## 📱 Mobile Workflow Walkthrough

1. **Login (`/login`)**: Log in with your email and password. Session cookies keep you authenticated on mobile browsers.
2. **Create Invoice (`/`)**: Fill customer details, tap quick-add preset classes (e.g. `Rice + 7 Curries`), apply discounts if needed, select payment method/status, and tap **Generate Invoice**.
3. **Download PDF & Share (`/invoice/[id]`)**:
   - Tap **Download PDF** to save `PDK-0001_CustomerName.pdf` directly to your phone.
   - Tap **Share on WhatsApp** to open WhatsApp with a pre-filled booking confirmation and attach the downloaded PDF.
4. **History & Accounting (`/history`)**:
   - Filter by Paid/Pending or search by guest name.
   - Tap **✓ Paid** to quickly update cash or bank transfers.
   - Tap **Export CSV** at the end of the month to download your accounting spreadsheet.
5. **Settings (`/settings`)**: Update your class prices or business WhatsApp number anytime.
