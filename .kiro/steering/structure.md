# Project Structure

## Folder Organization

```
/
├── app/                    # Next.js App Router pages
│   ├── customers/          # Customer management page
│   ├── dashboard/          # Main dashboard
│   ├── meter/             # Meter reading input
│   ├── reports/           # Reports and analytics
│   ├── layout.tsx         # Root layout with theme provider
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # Reusable React components
├── lib/                   # Core utilities and clients
│   ├── supabase.ts        # Supabase client configuration
│   ├── supabaseClient.ts  # Alternative client setup
│   ├── supabaseUtils.ts   # Database utility functions
│   └── theme.tsx          # Theme provider component
├── types/                 # TypeScript type definitions
│   └── types.ts           # Core interfaces (Customer, MeterReading, ReportData)
├── utils/                 # Utility functions
│   ├── export.ts          # General export utilities
│   ├── exportCSV.ts       # CSV export functionality
│   └── exportPDF.ts       # PDF export functionality
├── styles/                # Additional stylesheets
└── public/                # Static assets
```

## Naming Conventions

### Files & Folders
- **Pages**: Use descriptive folder names in `app/` directory
- **Components**: PascalCase (e.g., `CustomerList.tsx`, `MeterInputForm.tsx`)
- **Utilities**: camelCase (e.g., `exportCSV.ts`, `supabaseUtils.ts`)
- **Types**: Singular form (e.g., `types.ts`)

### Code Conventions
- **Interfaces**: PascalCase with descriptive names (Customer, MeterReading, ReportData)
- **Functions**: camelCase with verb-noun pattern
- **Constants**: UPPER_SNAKE_CASE for environment variables

## Import Patterns
- Use `@/` path alias for imports from project root
- Group imports: external libraries first, then internal modules
- Organize imports with Biome's auto-organize feature

## Component Architecture
- **Pages**: Located in `app/` directory using App Router
- **Reusable Components**: Stored in `components/` directory
- **Layout**: Single root layout with theme provider
- **Styling**: Tailwind CSS classes with dark mode support

## Data Layer
- **Database Client**: Centralized in `lib/supabase.ts`
- **Type Definitions**: All interfaces in `types/types.ts`
- **Utilities**: Database helpers in `lib/supabaseUtils.ts`