# AutoController - replit.md

## Overview

AutoController is a comprehensive financial management and analysis system built for Brazilian businesses. It provides tools for:

- **DRE (Income Statement) Analysis** - Importing, managing, and analyzing accounting data
- **Budget Management** - Tracking actual vs budgeted performance across departments
- **Automated Budget Wizard** - 3-step wizard (Classify → Configure → Generate) for automated budget generation based on historical data
- **Multi-tenant Architecture** - Supporting multiple economic groups with data isolation
- **Report Generation** - Custom financial report templates and structures
- **Cost Center Management** - Mapping accounts to cost centers and departments
- **Operational Data System** - Integrating non-financial KPIs with financial reports using formula-based calculations

The application is designed for controllers and financial managers to perform period closing, generate management reports, and analyze business performance across multiple companies and brands within an economic group.

- **Support System** - Ticket-based support for IT and Controller teams (`SupportView.tsx`)
- **Learning Center** - Documentation and guides hub with searchable articles (`DocumentationView.tsx`)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **Next.js 16** with App Router (`app/` directory)
- **React 19** with TypeScript for type safety
- **Tailwind CSS 4** with custom CSS variables for theming
- Dual build system: Next.js for production, Vite available for development flexibility

### UI Component Library
- **shadcn/ui** components (new-york style) located in `components/ui/`
- **Radix UI** primitives for accessible components
- **Lucide React** for iconography
- Custom design system with CSS variables defined in `app/globals.css`

### Sidebar Design (Qlik Cloud-inspired)
- **UnifiedSidebar** component (`src/components/UnifiedSidebar.tsx`) with two modes:
  - `mode="sections"`: Hierarchical navigation with expandable sections (tenant dashboard)
  - `mode="flat"`: Single-level navigation without children (admin console)
- Icon bar: 88px width, dark blue background (`#1e3a5f`)
- Expandable panel: 224px width, white background
- Key props: `iconBarColor`, `panelTitle`, `showHomeButton`, `primaryColor`, `secondaryColor`, `containerColor` (per-item custom background)
- Special items at bottom: Support (headphones icon) and Learning Center (purple background `#7c3aed` - stimulates learning)

### Full-Screen Layout Pattern (Standard)
All data/editor views follow the full-screen white background pattern:
- **UnifiedLayout** (`src/components/UnifiedLayout.tsx`) has NO default padding - each view manages its own spacing
- Main element structure: `<main className="flex-grow flex flex-col h-full overflow-hidden bg-white">`
- Inner container: `<div className="w-full flex flex-col h-full">`
- Content wrapper: `<div className="flex flex-col overflow-hidden flex-grow">`
- Views that need padding add it internally: `p-6` or similar
- Views that need scrolling add `overflow-y-auto` internally
- This pattern ensures 100% width utilization without visible margins/borders

### State Management
- React useState/useEffect hooks for local state
- LocalStorage for theme persistence and session data
- No external state management library (Redux, Zustand, etc.)

### Data Layer
- **Supabase** as the backend-as-a-service:
  - PostgreSQL database with Row Level Security (RLS)
  - Authentication and user management
  - Real-time subscriptions capability
- Database utilities in `src/utils/db.ts`
- Supabase client configured in `src/utils/supabaseClient.ts`

### Multi-Tenancy Pattern
- **Single Database, Shared Schema** architecture
- All tables include `grupo_economico_id` foreign key
- RLS policies enforce tenant isolation at database level
- Helper functions: `get_user_tenant_id()` and `is_admin_of_tenant()`

### Authentication
- Supabase Auth for user authentication
- Environment-based redirect URLs for development/production
- Role-based access control (admin, user roles per tenant)

### Data Architecture for Reports
- **DRE (Income Statement)** uses `lancamentos_contabeis` (accounting entries)
  - Required for department-level analysis via `centro_resultado_id`
  - Paginated loading with 50,000 records per page
  - Function: `getDreAggregatedData()` in `src/utils/db.ts`
- **Balanço Patrimonial / Fluxo de Caixa** uses `saldos_mensais` (monthly balances)
  - Pre-aggregated data for better performance
  - No department view needed - only brand and consolidated views
  - Data passed via `monthlyBalances` prop from `useAppData`
- **Razão Contábil / Auditoria Contábil** uses `lancamentos_contabeis`
  - Individual transaction-level data for detailed ledger queries

### Data Import/Export
- **xlsx** library for Excel file parsing
- Bulk import support for accounting entries
- Column mapping interface for flexible imports

### Charting & Visualization
- **Recharts** for financial charts and graphs

## External Dependencies

### Backend Services
- **Supabase** - Database, authentication, and RLS
  - Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Service role key used only server-side (never exposed to frontend)

### AI Integration
- **Google Gemini AI** (`@google/genai`) - Financial insights and chat assistant
  - Environment variable: `GEMINI_API_KEY`
  - Used in `src/utils/ai.ts` for generating financial analysis

### Analytics
- **Vercel Analytics** - Usage tracking for production deployments

### Deployment
- **Vercel** - Primary hosting platform
- Automatic deployments from repository via v0.app sync

### Development Tools
- TypeScript for type checking
- PostCSS with Tailwind CSS plugin
- ESLint for code quality (via Next.js)