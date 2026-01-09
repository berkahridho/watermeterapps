---
inclusion: always
---

# Water Meter Monitoring System - Product Rules

Indonesian neighborhood water meter management system with mobile-first design and Supabase backend.

## Authentication & Authorization

### Demo Credentials
- **Login**: `admin@example.com` / `password`
- **Implementation**: Use Supabase Auth with email/password only
- **Route Protection**: Wrap protected pages with `ProtectedRoute` component
- **Session Management**: Handle auth state in layout.tsx with theme provider

### Role-Based Access
- **Admin Features**: User management, discount management, data import
- **Field Worker Features**: Meter reading input, customer lookup
- **Check Permissions**: Use `roleService.ts` for role validation

## Core Business Logic

### Customer Data Rules
- **Required Fields**: name, RT number, phone (all text fields)
- **RT Format**: Indonesian neighborhood identifiers ("RT 01", "RT 02", etc.)
- **Phone Validation**: Accept Indonesian phone formats (+62, 08xx)
- **Unique Constraints**: RT numbers should be unique within system

### Meter Reading Validation
- **Sequential Rule**: New reading >= previous reading (prevent tampering)
- **Monthly Limit**: One reading per customer per month maximum
- **Anomaly Detection**: Warn if usage > 200% of 5-month rolling average
- **Usage Formula**: `current_reading - previous_reading`
- **Timestamp**: Auto-record submission date, not reading date

### Discount System Business Rules
- **Admin Only**: Only admin users can create/modify discounts
- **Types**: Percentage (%) or fixed amount (Rp) - never both simultaneously
- **Monthly Scope**: Applied per month using YYYY-MM format
- **Audit Trail**: Require reason field for all discount entries
- **Status Control**: Use is_active flag, never delete discount records
- **Uniqueness**: One active discount per customer per month
- **Billing Order**: Apply discounts before final bill calculation

## Indonesian Localization Standards

### Date Handling (Critical)
- **Display Format**: DD/MM/YYYY everywhere - never MM/DD/YYYY
- **Implementation**: Use `formatDateID()` from `@/utils/dateFormat`
- **Month-Year**: Use `formatMonthYearID()` for month displays
- **Locale Setting**: `id-ID` for all date operations
- **Consistency**: Apply across all components, exports, and reports

### Number & Currency Formatting
- **Currency**: Indonesian Rupiah (Rp) prefix
- **Decimal Separator**: Use comma (,) for decimals if needed
- **Thousand Separator**: Use period (.) for thousands

## UI/UX Implementation Rules

### Mobile-First Requirements
- **Primary Users**: Field workers on mobile devices
- **Touch Targets**: Minimum 44px for buttons and inputs
- **Form Layout**: Single-column on mobile, avoid horizontal scrolling
- **Data Tables**: Horizontal scroll with sticky first column
- **Loading States**: Show progress for slow network connections

### Component Patterns
- **Forms**: Use `InputField` and `SelectField` components consistently
- **Buttons**: Use `Button` component with proper loading states
- **Tables**: Use `DataTable` component with export functionality
- **Navigation**: Use `Navigation` component with role-based menu items
- **Theme**: Support dark mode with `ThemeToggle` component

### Error Handling Patterns
- **Validation**: Show inline errors immediately on blur
- **Submission**: Show loading state and success/error feedback
- **Network**: Handle offline scenarios gracefully
- **Data Integrity**: Confirm destructive actions with dialogs

## Database Integration Rules

### Supabase Client Usage
- **Primary Client**: Use `supabase` from `@/lib/supabase`
- **Utilities**: Use functions from `@/lib/supabaseUtils` for common operations
- **Error Handling**: Always handle Supabase errors gracefully
- **Real-time**: Use subscriptions for live data updates where appropriate

### Query Patterns
- **Filtering**: Use date ranges and customer filters consistently
- **Sorting**: Default to newest first for time-based data
- **Pagination**: Implement for large datasets (>100 records)
- **Joins**: Use Supabase's foreign key relationships efficiently

### Data Validation
- **Client-Side**: Validate before submission using validation service
- **Server-Side**: Rely on database constraints and RLS policies
- **Anomaly Detection**: Implement usage pattern warnings
- **Audit Trail**: Log all data modifications with timestamps

## Export & Reporting Implementation

### File Generation Rules
- **PDF Reports**: Use jsPDF with Indonesian date formatting
- **CSV Exports**: Use papaparse with UTF-8 encoding
- **File Naming**: Format as `{report_type}_{date_range}_{timestamp}.{ext}`
- **Data Validation**: Check completeness before export generation

### Report Content Standards
- **Date Ranges**: Support custom date filtering with DD/MM/YYYY inputs
- **Customer Selection**: Allow single or multiple customer filtering
- **Usage Display**: Show previous reading, current reading, calculated usage
- **Totals**: Include summary rows for usage and billing totals
- **Headers**: Include generation date and filter criteria

### Export Components
- **Use**: `ExportButtons` component for consistent export UI
- **Location**: Place export actions prominently in table headers
- **Feedback**: Show progress during generation and success confirmation
- **Error Handling**: Display clear messages for export failures

## Financial System Integration

### Transaction Management
- **Components**: Use financial components from `@/components/financial/`
- **Service Layer**: Use `@/lib/financialService` for business logic
- **Types**: Import from `@/types/financial` for type safety
- **Validation**: Use `AmountInput` for currency inputs

### Billing Integration
- **Discount Application**: Apply customer discounts before final calculation
- **Receipt Generation**: Include discount details on receipts
- **Audit Trail**: Track all financial transactions with timestamps
- **Reporting**: Generate financial reports with proper categorization

## Development Guidelines

### Code Organization
- **Pages**: Use App Router structure in `app/` directory
- **Components**: Group related components in subdirectories
- **Services**: Keep business logic in `lib/` directory
- **Types**: Centralize type definitions in `types/` directory
- **Utils**: Place utility functions in `utils/` directory

### Error Handling Strategy
- **User Feedback**: Show clear, actionable error messages
- **Logging**: Log errors for debugging without exposing sensitive data
- **Fallbacks**: Provide graceful degradation for failed operations
- **Validation**: Implement both client and server-side validation

### Performance Considerations
- **Mobile Optimization**: Minimize bundle size and network requests
- **Caching**: Use appropriate caching strategies for static data
- **Loading States**: Show progress indicators for async operations
- **Offline Support**: Consider offline capabilities for field workers