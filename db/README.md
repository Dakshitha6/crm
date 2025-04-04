# Swift CRM Database Setup

This directory contains SQL scripts for setting up the database for Swift CRM. The database uses Supabase (PostgreSQL) and follows a multi-tenant architecture.

## Database Architecture

Swift CRM uses a hybrid multi-tenant approach:

1. **Public Schema**: Contains shared tables for users, organizations, and user memberships
2. **Organization Schemas**: Each organization gets its own schema (`org_<org_id>`) for isolated CRM data

## Setup Instructions

Run these scripts in your Supabase SQL Editor in the following order:

1. **init.sql**: Creates the basic tables in the public schema
   - `users` - User profiles synced with Auth
   - `organizations` - Organization details
   - `user_organizations` - Many-to-many relationship between users and organizations
   - `invitations` - Invitations for users to join organizations

2. **auth_triggers.sql**: Creates triggers to synchronize Auth with the users table
   - Automatically adds new users to the users table
   - Handles user deletions
   - Updates last login timestamp
   - Handles email verification

3. **org_functions.sql**: Creates functions for organization management
   - `create_org_schema()` - Creates a new schema for an organization
   - `create_org_tables()` - Creates standard CRM tables in the organization schema

## Security Model

The database uses Row Level Security (RLS) policies to enforce access control:

1. **User-level security**: Users can only see and edit their own profiles
2. **Organization-level security**: Users can only access organizations they are members of
3. **Role-based access**: Different permissions for admins vs regular members
4. **Schema isolation**: Each organization's data is isolated in its own schema

## Organization Schema Tables

Each organization schema contains the following tables:

1. **leads**: Sales leads and prospects
2. **projects**: Client projects and their status
3. **companies**: Client/partner companies
4. **contacts**: Individual contacts at companies

## Sample Queries

### Get user's organizations

```sql
SELECT o.* 
FROM organizations o
JOIN user_organizations uo ON o.org_id = uo.organization_id
WHERE uo.user_id = auth.uid();
```

### Get all leads for an organization

```sql
SELECT * 
FROM org_<org_id>.leads;
```

### Check if user is a member of an organization

```sql
SELECT EXISTS (
  SELECT 1 
  FROM public.user_organizations 
  WHERE organization_id = '<org_id>' 
  AND user_id = auth.uid()
);
```

## Notes on Schema Creation

Organization schemas are created programmatically when a new organization is created. The application code should call the `create_org_schema()` and `create_org_tables()` functions after creating a new organization record.

## Data Migration

If you need to migrate data between organizations, you can use the following pattern:

```sql
INSERT INTO org_<target_org_id>.leads
SELECT * FROM org_<source_org_id>.leads
WHERE <condition>;
``` 