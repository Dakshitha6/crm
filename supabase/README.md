# Supabase Database Setup

This directory contains SQL scripts to set up the database schema for Swift CRM.

## Setup Instructions

1. Log in to your Supabase dashboard: https://app.supabase.com/
2. Select your project
3. Go to the SQL Editor menu
4. Create a new query
5. Execute the scripts in the following order:

### 1. Initialize Tables
Copy the contents of `init.sql` and run it to create the basic tables structure. This includes:

- `users` table (synced with Supabase Auth)
- `organizations` table
- `user_organizations` table
- `invitations` table
- Helper functions and policies for row-level security

### 2. Set Up Auth Triggers
Copy the contents of `auth_triggers.sql` and run it to create the triggers that will:

- Automatically create entries in the `users` table when new users sign up
- Keep the `users` table in sync with Supabase Auth

## Authentication Setup

Make sure you've enabled the following in your Supabase Authentication settings:

1. **Email Auth**: Go to Authentication → Providers → Email and enable:
   - Email confirmations (required)
   - Secure email change (recommended)

2. **Google OAuth** (if using Google Sign-In):
   - Go to Authentication → Providers → Google
   - Enable Google sign-in
   - Add your Google OAuth credentials

## Troubleshooting

- **"relation does not exist"**: Make sure you've run the initialization scripts in the correct order.
- **Trigger errors**: If you get errors about triggers already existing, the script includes DROP TRIGGER statements to handle this.
- **Auth sync issues**: If users aren't being synchronized properly, check if the trigger on auth.users is functioning correctly.

## Database Schema Reference

### users
- `id`: UUID (Primary Key, linked to auth.users)
- `email`: VARCHAR(255) (Not Null, Unique)
- `phone_number`: VARCHAR(20)
- `first_name`: VARCHAR(100)
- `last_name`: VARCHAR(100)
- `job_title`: VARCHAR(100)
- `timezone`: VARCHAR(50)
- `email_verified`: BOOLEAN (Default: false)
- `created_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP)
- `updated_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP)

### organizations
- `org_id`: UUID (Primary Key, auto-generated)
- `name`: VARCHAR(100) (Not Null)
- `description`: TEXT
- `website`: VARCHAR(255)
- `phone_number`: VARCHAR(20)
- `address`: VARCHAR(255)
- `city`: VARCHAR(100)
- `state`: VARCHAR(100)
- `zip`: VARCHAR(20)
- `country`: VARCHAR(100)
- `logo_url`: TEXT
- `created_by`: UUID (Not Null, References users.id)
- `created_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP)

### user_organizations
- `id`: UUID (Primary Key, auto-generated)
- `user_id`: UUID (Not Null, References users.id)
- `organization_id`: UUID (Not Null, References organizations.org_id)
- `role`: VARCHAR(20) (Restricted to: 'admin', 'manager', 'employee')
- `created_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP)
- Unique constraint on (user_id, organization_id)

### invitations
- `id`: UUID (Primary Key, auto-generated)
- `email`: VARCHAR(255) (Not Null)
- `organization_id`: UUID (Not Null, References organizations.org_id)
- `invited_by`: UUID (Not Null, References users.id)
- `role`: VARCHAR(20) (Restricted to: 'admin', 'manager', 'employee')
- `status`: VARCHAR(20) (Default: 'pending', Restricted to: 'pending', 'accepted', 'rejected')
- `created_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP)
- `expires_at`: TIMESTAMP (Default: CURRENT_TIMESTAMP + 7 days) 