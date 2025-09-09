# 🎤 EzneShast - Professional Voice Transcription Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.57.0-green)](https://supabase.com/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-2.9.0-orange)](https://elevenlabs.io/)

> **EzneShast** (ازنشاست) is a professional voice transcription and meeting minutes generation platform designed for businesses and individuals. It provides high-quality Persian and multi-language transcription services with advanced features like speaker diarization, audio event detection, and intelligent summarization.

## ✨ Features

### 🎯 Core Features

- **High-Quality Transcription**: Powered by ElevenLabs Scribe v1 with speaker diarization
- **Multi-Language Support**: Persian, English, Arabic, and 10+ other languages
- **Meeting Minutes Generation**: AI-powered summarization with structured output
- **Real-time Processing**: Fast transcription with progress tracking
- **Credit-Based System**: Flexible pricing with admin-controlled credit management

### 🔧 Technical Features

- **Modern Architecture**: Next.js 15 with App Router and TypeScript
- **Secure Authentication**: Supabase Auth with magic links and OAuth
- **Database Security**: Row Level Security (RLS) with audit logging
- **Rate Limiting**: Built-in protection against abuse
- **Error Handling**: Comprehensive error management with retry logic
- **File Management**: Secure file upload and processing
- **Admin Panel**: Complete admin interface for user and credit management

### 🎨 User Experience

- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Live progress tracking and status updates
- **Intuitive Interface**: Clean, modern UI with Persian RTL support
- **Accessibility**: WCAG compliant with keyboard navigation
- **Performance**: Optimized for speed with caching and compression

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Supabase** account and project
- **ElevenLabs** API key
- **Groq** API key (optional, for fallback)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ezneshast/ezneshast.git
   cd ezneshast
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` with your configuration:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # API Keys
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   GROQ_API_KEY=your_groq_api_key

   # Admin Configuration
   ADMIN_EMAILS=admin@yourcompany.com,superadmin@yourcompany.com
   ```

4. **Set up the database**

   ```bash
   # Run the enhanced schema
   psql -h your-db-host -U postgres -d postgres -f supabase-schema-enhanced.sql
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
ezneshast/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── v1/                   # Versioned API endpoints
│   │   │   ├── voice-transcribe/ # Transcription API
│   │   │   ├── voice-meeting-minutes/ # Meeting minutes API
│   │   │   └── admin/            # Admin API endpoints
│   │   └── auth/                 # Authentication endpoints
│   ├── components/               # Reusable UI components
│   ├── dashboard/                # User dashboard
│   ├── admin/                    # Admin panel
│   ├── voice-transcribe/         # Voice transcription page
│   ├── voice-meeting-minutes/    # Meeting minutes page
│   └── auth/                     # Authentication pages
├── lib/                          # Core library
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── validators/               # Input validation
│   ├── constants/                # Application constants
│   ├── supabase.ts              # Supabase client configuration
│   ├── supabase-server.ts       # Server-side Supabase helpers
│   ├── audio-processor.ts       # Audio processing utilities
│   ├── transcription-service.ts  # Transcription service
│   ├── summarization-service.ts  # Summarization service
│   └── meeting-processor.ts     # Meeting processing orchestrator
├── scripts/                      # CLI scripts
│   └── charge-credits.js        # Credit management script
├── public/                       # Static assets
├── supabase-schema-enhanced.sql  # Enhanced database schema
└── README.md                     # This file
```

## 🔧 Configuration

### Environment Variables

| Variable                        | Description                  | Required | Default               |
| ------------------------------- | ---------------------------- | -------- | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL         | ✅       | -                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key       | ✅       | -                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key    | ✅       | -                     |
| `ELEVENLABS_API_KEY`            | ElevenLabs API key           | ✅       | -                     |
| `GROQ_API_KEY`                  | Groq API key                 | ❌       | -                     |
| `ADMIN_EMAILS`                  | Comma-separated admin emails | ✅       | -                     |
| `NEXT_PUBLIC_SITE_URL`          | Site URL for redirects       | ❌       | http://localhost:3000 |

### Database Configuration

The enhanced schema includes:

- **Enhanced Tables**: `credits`, `credit_ledger`, `jobs`, `files`, `user_profiles`, `system_settings`, `audit_log`
- **Row Level Security**: Comprehensive RLS policies for data protection
- **Audit Logging**: Complete audit trail for admin actions
- **Indexes**: Optimized database performance
- **Functions**: Atomic credit operations with idempotency

## 🎯 Usage

### For Users

1. **Sign Up**: Enter your email to receive a magic link
2. **Access Dashboard**: View your credit balance and recent activity
3. **Upload Audio**: Use voice transcription or meeting minutes features
4. **Download Results**: Get transcripts and summaries in various formats

### For Admins

1. **Access Admin Panel**: Navigate to `/admin` (requires admin email)
2. **Manage Credits**: Add or deduct credits from user accounts
3. **View Analytics**: Monitor system usage and user activity
4. **Audit Logs**: Review all admin actions and system changes

### CLI Usage

```bash
# Add credits to a user
node scripts/charge-credits.js user@example.com 100 "Initial credit"

# Deduct credits from a user
node scripts/charge-credits.js user@example.com -50 "Refund for failed service"

# View help
node scripts/charge-credits.js
```

## 🔒 Security Features

### Authentication & Authorization

- **Magic Link Authentication**: Secure, passwordless login
- **OAuth Integration**: Google, GitHub, and other providers
- **Session Management**: Secure cookie-based sessions
- **Admin Role Management**: Email-based admin access control

### Data Protection

- **Row Level Security**: Database-level access control
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Protection against abuse and DDoS
- **Audit Logging**: Complete audit trail for compliance

### API Security

- **CORS Configuration**: Proper cross-origin resource sharing
- **Security Headers**: XSS, CSRF, and clickjacking protection
- **Request Validation**: Type-safe API endpoints
- **Error Handling**: Secure error responses without information leakage

## 📊 Monitoring & Analytics

### Built-in Monitoring

- **Request Logging**: Comprehensive API request logging
- **Error Tracking**: Detailed error reporting and stack traces
- **Performance Metrics**: Processing time and resource usage tracking
- **User Analytics**: Usage patterns and feature adoption

### Health Checks

- **API Health**: `/api/health` endpoint for monitoring
- **Database Health**: Connection and query performance monitoring
- **External Services**: ElevenLabs and Groq API status monitoring

## 🚀 Deployment

### Production Deployment

1. **Build the application**

   ```bash
   npm run build
   ```

2. **Set up production environment**

   - Configure production environment variables
   - Set up Supabase production project
   - Configure CDN and file storage

3. **Deploy to your platform**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment-Specific Configuration

- **Development**: Full debugging and hot reload
- **Staging**: Production-like environment for testing
- **Production**: Optimized for performance and security

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📈 Performance Optimization

### Built-in Optimizations

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Bundle Analysis**: Built-in bundle analyzer
- **Caching**: Redis-based caching for frequently accessed data
- **Compression**: Gzip/Brotli compression for all responses

### Database Optimization

- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Indexed queries and efficient data access
- **Caching Layer**: Redis caching for user data and system settings

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run type-check   # Run TypeScript type checking
npm run test         # Run tests
npm run clean        # Clean build artifacts
```

### Code Quality

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Code quality and consistency enforcement
- **Prettier**: Code formatting (configured via ESLint)
- **Husky**: Git hooks for pre-commit validation

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Follow the existing code style and patterns
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: Contact support@ezneshast.com for urgent issues

### Troubleshooting

#### Common Issues

1. **Authentication Errors**

   - Check Supabase configuration
   - Verify redirect URLs in Supabase dashboard
   - Ensure admin emails are properly configured

2. **API Errors**

   - Verify API keys are correct and active
   - Check rate limits and quotas
   - Review error logs for detailed information

3. **Database Issues**
   - Ensure schema is properly applied
   - Check RLS policies and permissions
   - Verify service role key permissions

#### Debug Mode

Enable debug mode by setting `DEBUG=true` in your environment variables for detailed logging.

## 🗺️ Roadmap

### Upcoming Features

- [ ] **Batch Processing**: Process multiple files simultaneously
- [ ] **Webhook Support**: Real-time notifications for job completion
- [ ] **API SDK**: Official SDKs for popular programming languages
- [ ] **Advanced Analytics**: Detailed usage analytics and reporting
- [ ] **Custom Models**: Fine-tuned models for specific domains
- [ ] **Integration APIs**: Third-party service integrations

### Long-term Vision

- **Enterprise Features**: SSO, advanced user management, custom branding
- **AI Enhancements**: Custom model training, advanced summarization
- **Global Expansion**: Multi-region deployment, localized interfaces
- **Mobile Apps**: Native iOS and Android applications

---

**Made with ❤️ by the EzneShast Team**

For more information, visit [ezneshast.com](https://ezneshast.com)

## Frontend Audit (Phase 1)

This section summarizes a quick audit of the current frontend to guide Phase 1 improvements. Scope: UI/UX, accessibility, performance, and code quality. Backend APIs and contracts remain untouched.

### Top 10 issues and opportunities

1. Navigation and entry points
   - Landing redirects authenticated users to `dashboard`, but unauthenticated flow is minimal. Consider clearer onboarding and links to key features.
2. Meeting workflows (minutes/transcript)
   - `app/voice-meeting-minutes/page.tsx` and `app/voice-transcribe/page.tsx` have basic flows but lack audio–transcript synchronization, speaker attribution, and quick jump actions.
3. Skeleton/loading states
   - Spinners are used; replace with skeletons for perceived performance (especially minutes/transcript areas).
4. Design system tokens
   - `app/globals.css` defines CSS variables and Tailwind v4 theme tokens, but there’s no small component library to enforce consistency.
5. Visual hierarchy and spacing
   - Utility classes are inconsistent across pages; introduce consistent spacing scale, card elevation, and radius usage.
6. Accessibility (WCAG basics)
   - Buttons lack explicit accessible names in some places; ensure `aria-label`, focus outlines, and keyboard shortcuts for audio controls.
7. RTL/LTR handling
   - Minutes page uses `dir="rtl"` thoughtfully; ensure mirrored layout, table semantics, and markdown headings are consistently styled (already partially handled in `globals.css`).
8. Error handling and empty states
   - Credit errors are surfaced, but empty states/onboarding for first-time users are missing.
9. Testing and Storybook
   - Storybook dependencies exist; initial stories and a11y checks are not yet present. No unit tests for components/hooks yet.
10. Performance and code quality

- Large components render markdown and blocks directly on pages. Extract into components, lazy-load heavy parts (e.g., waveform later), and add TypeScript strictness for props.

### Prioritized recommendations (Phase 1)

- Implement a Meeting Detail UI with:
  - Audio player with keyboard shortcuts (space/←/→) and prepared slot for waveform (lazy import).
  - Transcript list with timestamp chips, clickable to seek, and basic highlight of the current segment.
  - Actions panel (copy/export markdown, download, quick filters/search input).
  - Skeletons for audio/transcript and minutes while processing.
- Establish a minimal component library (atoms → molecules → organisms):
  - Button, Input, Card, Tag/Badge, Modal, Table, List, Skeleton, AudioPlayer, TranscriptLine.
  - Add Storybook with a11y addon, initial stories for these components.
- Add hooks: `useAudio`, `useTranscriptSearch`, `useDebounce`, `useSupabaseAuth`.
- Accessibility: ensure focus styles, roles/labels on controls, and color contrast.
- Testing: set up unit tests for hooks/components (Vitest + RTL), add one E2E smoke path with Playwright later.

### Non-goals / constraints

- No backend contract changes. All API calls remain as-is.
- Keep performance stable: prefer lazy-loading and memoization where needed.

### Next steps

- PR 1: Audit (this section) + scaffolding for components and Storybook.
- PR 2: Meeting Detail with audio–transcript sync and skeletons.
- PR 3: Transcript editor polish and export modal.
