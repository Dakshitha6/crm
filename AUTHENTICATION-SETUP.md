# Swift CRM Authentication Setup Guide

This guide will help you set up the authentication system for Swift CRM. Follow these steps to ensure your authentication flows work correctly.

## 1. Database Setup

First, set up your Supabase database tables and triggers:

1. Navigate to your Supabase project and open the SQL Editor.
2. Run the following scripts in order:
   - `db/init.sql` - Creates the basic tables (users, organizations, user_organizations, invitations)
   - `db/auth_triggers.sql` - Sets up triggers to sync Auth with the users table

## 2. Authentication Configuration in Supabase

Configure authentication settings in your Supabase project:

1. Go to Authentication → Settings
2. Configure Site URL: Set it to your application URL (e.g., `http://localhost:3000` for local development)
3. Enable the following providers:
   - Email (set Email confirmations to "Required")
   - Google OAuth (optional)
4. Configure email templates:
   - Customize the "Confirm signup" email template if desired

## 3. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Authentication Flow

The authentication flow in Swift CRM works as follows:

1. **User Registration (`/auth/register`)**
   - User registers with email and password
   - A verification email is sent to the user
   
2. **Email Verification (`/auth/verify-email`)**
   - User clicks the link in the verification email
   - The page handles verification with Supabase
   - If successful, user proceeds to onboarding
   
3. **User Onboarding (`/auth/onboarding`)**
   - User completes their profile with name and other details
   - Profile information is saved in the `users` table
   - User is marked as onboarded (`is_onboarded = true`)
   
4. **Organization Creation (`/orgs/new`)**
   - User creates their first organization
   - User is automatically assigned as an admin of this organization
   
5. **Dashboard Access (`/orgs/[orgId]/dashboard`)**
   - User can now access the organization dashboard
   - Additional users can be invited to join the organization

## 5. Security Features

The authentication implementation includes:

- **Middleware Protection**: All dashboard routes are protected by middleware
- **Email Verification**: Users must verify their email before accessing the system
- **Session Management**: Expired sessions are detected and users are redirected to login
- **Role-based Access**: Different user roles (admin, manager, member) with specific permissions
- **Multi-tenant Architecture**: Data isolation between organizations

## 6. Troubleshooting

### Common Issues

1. **"Auth session missing!" error**
   - This usually indicates a problem with the middleware
   - Check that your Supabase configuration is correct
   - Ensure cookies are properly set

2. **Email verification not working**
   - Verify your Site URL in Supabase is correct
   - Check that email confirmations are enabled
   - Look for any email delivery issues in Supabase logs

3. **Users not being added to the database**
   - Check that the `auth_triggers.sql` script has been run
   - Verify the triggers are active in your Supabase database

### Debug Steps

1. Check the browser console for errors
2. Verify network requests to the Supabase API
3. Check Supabase logs for authentication issues
4. Ensure all environment variables are correctly set

## 7. Testing the Authentication Flow

To test the complete flow:

1. Register a new user
2. Verify the email
3. Complete the onboarding process
4. Create a new organization
5. Try logging out and logging back in
6. Test session expiration by waiting or manually clearing cookies

## Next Steps

After setting up authentication, you can proceed to implement:

1. Organization dashboard
2. User invitation system
3. Role and permission management
4. CRM-specific features 