# Pinoy SG Billiards - Suggested Dependencies

## Core Dependencies (Already Installed)

- **Next.js 16.0.0** - React framework with App Router
- **React 19.2.0** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling framework
- **ESLint** - Code linting

## Recommended Additional Dependencies

### UI Components & Icons

```bash
npm install lucide-react
```

- **lucide-react** - Modern icon library (already used in components)
- Alternative: `react-icons` for more icon options

### State Management

```bash
npm install zustand
# or
npm install @reduxjs/toolkit react-redux
```

- **Zustand** - Lightweight state management (recommended)
- **Redux Toolkit** - More complex state management if needed

### Form Handling

```bash
npm install react-hook-form @hookform/resolvers zod
```

- **react-hook-form** - Form validation and handling
- **@hookform/resolvers** - Form validation resolvers
- **zod** - Schema validation

### Data Fetching & API

```bash
npm install @tanstack/react-query
# or
npm install swr
```

- **TanStack Query** - Server state management and caching
- **SWR** - Alternative data fetching library

### Database & Backend

```bash
npm install prisma @prisma/client
# or
npm install mongoose
# or
npm install @supabase/supabase-js
```

- **Prisma** - Type-safe database ORM (recommended)
- **Mongoose** - MongoDB object modeling
- **Supabase** - Backend-as-a-Service with PostgreSQL

### Authentication

```bash
npm install next-auth
# or
npm install @supabase/auth-helpers-nextjs
```

- **NextAuth.js** - Authentication for Next.js
- **Supabase Auth** - If using Supabase backend

### Real-time Features

```bash
npm install socket.io-client
# or
npm install @supabase/realtime-js
```

- **Socket.io** - Real-time communication
- **Supabase Realtime** - Real-time subscriptions

### File Upload & Storage

```bash
npm install @uploadthing/react
# or
npm install @supabase/storage-js
```

- **UploadThing** - File upload service
- **Supabase Storage** - File storage with Supabase

### Date & Time

```bash
npm install date-fns
# or
npm install dayjs
```

- **date-fns** - Modern date utility library
- **dayjs** - Lightweight date library

### Charts & Analytics

```bash
npm install recharts
# or
npm install chart.js react-chartjs-2
```

- **Recharts** - React charting library
- **Chart.js** - Popular charting library

### Notifications

```bash
npm install react-hot-toast
# or
npm install react-toastify
```

- **react-hot-toast** - Toast notifications
- **react-toastify** - Alternative toast library

### Testing

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
```

- **Testing Library** - React testing utilities
- **Jest** - Testing framework

### Development Tools

```bash
npm install --save-dev prettier eslint-config-prettier
```

- **Prettier** - Code formatting
- **ESLint Prettier** - Prettier integration with ESLint

## Firebase Integration (Alternative Backend)

```bash
npm install firebase
```

- **Firebase** - Google's backend platform
- Includes: Authentication, Firestore, Storage, Hosting

## Deployment Dependencies

```bash
npm install --save-dev @vercel/analytics
```

- **Vercel Analytics** - Analytics for Vercel deployments

## Recommended Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
├── hooks/                 # Custom React hooks
├── store/                 # State management (Zustand/Redux)
├── types/                 # TypeScript type definitions
├── utils/                 # Helper functions
└── styles/                # Additional CSS files
```

## Priority Installation Order

1. **lucide-react** - For icons (already used)
2. **zustand** - For state management
3. **react-hook-form + zod** - For form handling
4. **@tanstack/react-query** - For data fetching
5. **prisma** - For database management
6. **next-auth** - For authentication

## Environment Variables Needed

```env
# Database
DATABASE_URL="your_database_url"

# Authentication
NEXTAUTH_SECRET="your_secret"
NEXTAUTH_URL="http://localhost:3000"

# API Keys
NEXT_PUBLIC_API_URL="your_api_url"
```

## Getting Started Commands

```bash
# Install core dependencies
npm install lucide-react zustand react-hook-form @hookform/resolvers zod @tanstack/react-query

# Install database
npm install prisma @prisma/client
npx prisma init

# Install authentication
npm install next-auth

# Install development tools
npm install --save-dev prettier eslint-config-prettier
```
