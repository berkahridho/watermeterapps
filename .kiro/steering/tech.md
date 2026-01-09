# Technology Stack

## Core Framework
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 3** for styling with dark mode support

## Backend & Database
- **Supabase** (PostgreSQL database, authentication, real-time features)
- Environment variables in `.env.local`

## Key Libraries
- **@supabase/supabase-js** - Database client
- **jsPDF** - PDF export functionality
- **papaparse** - CSV parsing and export
- **react-icons** - Icon library

## Development Tools
- **Biome** - Linting and formatting (replaces ESLint/Prettier)
- **TypeScript** - Type safety
- **Turbopack** - Fast bundler for dev/build

## Date Formatting
- **Indonesian Format**: All dates displayed in DD/MM/YYYY format using `id-ID` locale
- **Utility Functions**: Use `formatDateID()` from `@/utils/dateFormat` for consistent formatting
- **Month Displays**: Use `formatMonthYearID()` for month-year combinations

## Common Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm run start        # Start production server
```

### Code Quality
```bash
npm run lint         # Run Biome linter
npm run format       # Format code with Biome
```

## Configuration Files
- `biome.json` - Linting and formatting rules
- `tailwind.config.js` - Tailwind CSS configuration with dark mode
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration with path aliases (@/*)

## Environment Setup
Required environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`