# Authentication & Credit System Setup

This document explains how to set up the authentication and credit gating system for your transcription app.

## Overview

The system includes:
- **Supabase Authentication** with magic links and OAuth
- **Credit-based access control** for transcription services
- **Admin panel** for credit management
- **Row Level Security (RLS)** for data protection
- **Atomic credit transactions** with idempotency

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your keys
3. Copy the SQL schema from `supabase-schema.sql` and run it in the SQL Editor

### 2. Environment Variables

Copy `env.example` to `.env.local` and fill in your values:

```bash
cp env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep secret!)
- `ADMIN_EMAILS`: Comma-separated list of admin emails
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key

### 3. Database Schema

The system creates three main tables:

#### `credits`
- Stores user credit balances
- Automatically created when users sign up
- Protected by RLS

#### `credit_ledger`
- Append-only transaction log
- Tracks all credit changes with reasons
- Used for auditing and debugging

#### `jobs`
- Records all transcription jobs
- Links to credit transactions
- Tracks job status and costs

### 4. Authentication Flow

1. **Sign In**: Users visit `/auth/signin`
2. **Magic Link**: Email-based authentication (no passwords)
3. **OAuth**: Google/GitHub integration (optional)
4. **Redirect**: Users return to intended destination
5. **Session**: Handled automatically by Supabase

### 5. Credit System

#### Credit Consumption
- Each transcription costs 10 credits
- Credits are consumed atomically before processing
- Idempotency prevents double-charging
- Insufficient credits return HTTP 402

#### Admin Management
- Access `/admin` with admin email
- Search users by email
- Add/deduct credits with reasons
- View system statistics

### 6. Route Protection

Middleware protects:
- `/dashboard` - Requires authentication
- `/voice-transcribe` - Requires authentication + credits
- `/admin` - Requires admin email
- `/auth/signin` - Redirects if already authenticated

## API Endpoints

### Authentication
- `POST /api/auth/signout` - Sign out user
- `GET /auth/callback` - Handle auth callbacks

### Transcription
- `POST /api/voice-transcribe` - Transcribe audio (requires credits)

### Admin
- `POST /api/admin/credits` - Manage user credits (admin only)

## Database Functions

### `consume_credits(p_cost, p_key, p_reason, p_ref)`
- Atomically deducts credits
- Prevents double-charging with idempotency key
- Returns success/failure with new balance
- Creates ledger entry and job record

## Security Features

1. **Row Level Security (RLS)**: Users only see their own data
2. **Service Role**: Server-only operations use service key
3. **Admin Verification**: Admin access by email whitelist
4. **Atomic Transactions**: Credit operations are atomic
5. **Idempotency**: Prevents duplicate charges

## Usage Examples

### Adding Credits (Admin)
```bash
curl -X POST /api/admin/credits \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "amount": 100,
    "reason": "Initial credit allocation"
  }'
```

### Checking Credits (User)
```javascript
const { data } = await supabase
  .from('credits')
  .select('balance')
  .eq('user_id', user.id)
  .single()
```

## Troubleshooting

### Common Issues

1. **"Authentication required"**: User not signed in
2. **"Insufficient credits"**: User needs more credits
3. **"Admin access required"**: Email not in admin list
4. **"User not found"**: Email doesn't exist in system

### Debug Steps

1. Check Supabase logs in dashboard
2. Verify environment variables
3. Check RLS policies are enabled
4. Confirm admin emails in environment

## Production Considerations

1. **Rate Limiting**: Add rate limiting to prevent abuse
2. **Monitoring**: Set up alerts for failed transactions
3. **Backups**: Regular database backups
4. **Scaling**: Consider connection pooling for high traffic
5. **Security**: Regular security audits and updates

## Free Tier Limits

- Supabase Free: 50,000 monthly active users
- 500MB database storage
- 2GB bandwidth
- 2GB file storage

For production, consider upgrading to Pro plan.

