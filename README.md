# Swift CRM - Next.js Multi-tenant CRM Application

A modern CRM system built with Next.js, Supabase, and Shadcn UI for multi-tenant organizations.

## Features

- **Authentication System**: Email/password and Google OAuth authentication
- **Multi-tenant Architecture**: Organizations with isolated data
- **User Management**: Invitations, roles, and permissions
- **Modern UI**: Built with Shadcn UI components

## Setup Instructions

### 1. Prerequisites

- Node.js (v18+)
- npm or yarn
- Supabase account and project

### 2. Installation

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/swift-crm.git
cd swift-crm
npm install
# or
yarn install
```

2. Create a `.env.local` file in the root directory with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup

1. Create a Supabase project and enable Email Auth and Google OAuth (if needed)
2. Run the SQL scripts in the Supabase SQL Editor in this order:
   - `db/init.sql` - Creates tables, relationships, and policies
   - `db/auth_triggers.sql` - Creates triggers to sync Auth and handle user events

### 4. Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

Visit http://localhost:3000 to see your application.

## Authentication Flow

1. **User Registration**: Users can register with email/password or Google OAuth
2. **Email Verification**: New users must verify their email before accessing the system
3. **Onboarding**: First-time users complete their profile information
4. **Organization Creation**: Users create or join an organization
5. **Dashboard Access**: After completing onboarding, users can access their organization dashboard

## User Roles

- **Admin**: Can manage organization settings, invite users, and assign roles
- **Manager**: Can manage CRM data with limited administrative capabilities
- **Member**: Can view and interact with CRM data but has limited permissions

## Project Structure

```
swift-crm/
├── db/                   # Database SQL scripts
├── public/               # Static assets
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Authentication pages (login, register, etc.)
│   │   ├── (dashboard)/  # Dashboard pages (protected routes)
│   │   ├── api/          # API routes
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions and libraries
│   ├── middleware.ts     # Authentication middleware
```

## Middleware

The application uses Next.js middleware to:
- Redirect unauthenticated users to the login page
- Check email verification status and redirect if necessary
- Check if users have completed onboarding
- Manage session expiration and redirection

## License

MIT
