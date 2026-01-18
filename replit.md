# AutoController - replit.md

## Overview

AutoController is a comprehensive financial management and analysis system built for Brazilian businesses. It provides tools for:

- **DRE (Income Statement) Analysis** - Importing, managing, and analyzing accounting data
- **Budget Management** - Tracking actual vs budgeted performance across departments
- **Multi-tenant Architecture** - Supporting multiple economic groups with data isolation
- **Report Generation** - Custom financial report templates and structures
- **Cost Center Management** - Mapping accounts to cost centers and departments
- **Operational Data System** - Integrating non-financial KPIs with financial reports using formula-based calculations

The application is designed for controllers and financial managers to perform period closing, generate management reports, and analyze business performance across multiple companies and brands within an economic group.

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
- Icon bar: 72px width, dark blue background (`#1e3a5f`)
- Expandable panel: 224px width, white background
- Key props: `iconBarColor`, `panelTitle`, `showHomeButton`, `primaryColor`, `secondaryColor`

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