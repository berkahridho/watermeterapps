# Water Meter Monitoring System

A Next.js application to monitor and manage water meter readings in neighborhoods.

## Features

- **Secure login** for your team
- **Customer management** (name, RT number, phone)
- **Input monthly meter readings** per customer
- **Customer discount system** with percentage or fixed amount discounts
- **Auto-save submission date**
- **Simple usage and billing reports**
- **Export reports to PDF/CSV** with discount information
- **Offline support** with automatic sync when online
- **Responsive UI** for desktop and mobile

## Tech Stack

- **Frontend:** Next.js 15 with App Router
- **Styling:** Tailwind CSS
- **Icons:** React Icons
- **Database:** Supabase (PostgreSQL)
- **Export:** jsPDF, Papa Parse
- **Deployment:** Vercel

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. Set up your Supabase database by running the SQL scripts:
   - Run `database-setup.sql` in your Supabase SQL Editor to create the basic tables
   - Run `database-discount-setup.sql` to add discount functionality (optional but recommended)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Authentication

For demonstration purposes, you can log in with:
- Email: `admin@example.com`
- Password: `password`

## Folder Structure

```
/
├── app/               # Next.js App Router pages
├── components/        # Reusable React components
├── lib/              # Supabase client
├── utils/            # Utility functions (export functions)
├── types/            # TypeScript type definitions
├── styles/           # Global styles
└── public/           # Static assets
```

## Database Schema

The application connects to Supabase with these tables:

- `customers`: id (uuid), name (text), rt (text), phone (text), created_at (timestamp)
- `meter_readings`: id (uuid), customer_id (foreign key), reading (integer), date (timestamp), created_at (timestamp)
- `customer_discounts`: id (uuid), customer_id (foreign key), discount_percentage (decimal), discount_amount (decimal), reason (text), valid_from (timestamp), valid_until (timestamp), created_by (text), created_at (timestamp), is_active (boolean)

**Note**: The discount table is optional. The app will work without it, but discount features will be disabled until the table is created.

## License

This project is open source and available under the [MIT License](LICENSE).