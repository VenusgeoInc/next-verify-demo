# PrivateID Next.js Integration Demo

A comprehensive demo application showcasing two integration methods for PrivateID's verification service:

1. **Redirect Flow**: Traditional full-page redirect to PrivateID's hosted verification
2. **iFrame Flow**: Embedded verification with real-time updates via Server-Sent Events (SSE)

## Features

- ✅ **Dual Integration Patterns**: Compare redirect vs iframe approaches
- ✅ **Configurable Requirements**: Choose between face-only or face + identity document verification
- ✅ **Real-time Updates**: SSE-powered instant result display for iframe flow
- ✅ **Webhook Handling**: Server-side webhook processing with automatic fallback polling
- ✅ **TypeScript**: Full type safety throughout
- ✅ **Modern UI**: Responsive design with Tailwind CSS v4
- ✅ **Session Management**: In-memory session store with pub/sub pattern
- ✅ **Both Verification Types**: Support for ENROLL and VERIFY flows
- ✅ **Auto-Detection**: Webhook URLs automatically use current hostname (ngrok-friendly)

## For Clients: Integration Guide

This demo application shows **two ways** to integrate PrivateID verification into your project:

### 🔄 Redirect Flow
- **Best for**: Simple integration, mobile-friendly
- **User Experience**: Full-page redirect to PrivateID → returns to your app
- **Complexity**: Low (3 API calls)
- **Use case**: Public-facing apps, mobile websites

### 📱 iFrame Flow
- **Best for**: Seamless embedded experience, desktop apps
- **User Experience**: Verification happens inline, no page redirect
- **Complexity**: Medium (4 API calls + SSE)
- **Use case**: Admin panels, progressive web apps, desktop applications

### Which Should You Choose?

| Factor | Redirect Flow | iFrame Flow |
|--------|--------------|-------------|
| Mobile compatibility | ✅ Excellent | ⚠️ Good (some mobile browsers limit iframes) |
| User experience | Good (leaves your app briefly) | ✅ Excellent (stays in your app) |
| Implementation | ✅ Simple | Medium |
| Real-time updates | Polling (2s intervals) | ✅ Instant (SSE) |
| Network efficiency | Good | ✅ Excellent |

**Recommendation**: Start with **Redirect Flow** for simplicity, migrate to **iFrame Flow** if you need seamless UX.

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─ Redirect Flow: Full page redirect → PrivateID → Return to result page
       │                 Result page polls for webhook data (with 10s fallback)
       │
       └─ iFrame Flow:   Embedded iframe → Real-time SSE updates
                         Results appear instantly when webhook arrives
```

## Prerequisites

- Node.js 18+ (currently running on Node 23.2.0, but 22+ recommended)
- npm or yarn
- **ngrok** or similar tunneling service (for local webhook testing)
- PrivateID API key

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API key (API key will be provided via email):

```env
PRIVATEID_API_KEY=your-api-key-here
PRIVATEID_API_BASE=https://api-orchestration.uat.privateid.com/v2
```

**Note**: You don't need to set `BASE_URL`! The app automatically detects your current URL (works with both localhost and ngrok).

### 3. Start the Dev Server

```bash
npm run dev
```

### 4. Set Up ngrok for Webhooks (Optional for Testing)

For webhook testing, use ngrok to create a public tunnel:

```bash
# In a separate terminal
ngrok http 3000
```

Then simply navigate to the ngrok URL (e.g., `https://abc123.ngrok.io`) instead of `localhost:3000`.

**That's it!** No need to update environment variables or restart the server. The app automatically uses the correct webhook URL based on your current hostname.

### 5. Test the Flows

Open your browser to `http://localhost:3000` (or your ngrok URL) and try both integration methods:

- **Redirect Flow**: `/redirect-flow`
- **iFrame Flow**: `/iframe-flow`

### 6. Monitor Webhooks

Open ngrok inspector to see webhook requests in real-time:

```
http://127.0.0.1:4040
```

## Project Structure

```
next-iframe-demo/
├── src/
│   ├── app/
│   │   ├── page.tsx                      # Home page
│   │   ├── layout.tsx                    # Root layout
│   │   ├── globals.css                   # Global styles
│   │   ├── redirect-flow/
│   │   │   ├── page.tsx                  # Redirect flow demo
│   │   │   └── result/
│   │   │       └── page.tsx              # Result page (polling)
│   │   ├── iframe-flow/
│   │   │   └── page.tsx                  # iFrame flow demo (SSE)
│   │   └── api/
│   │       ├── sessions/
│   │       │   ├── route.ts              # POST: Create session, GET: List sessions
│   │       │   └── [sessionId]/
│   │       │       ├── route.ts          # GET: Session status
│   │       │       └── stream/
│   │       │           └── route.ts      # GET: SSE stream
│   │       └── webhook/
│   │           └── route.ts              # POST: Webhook handler
│   ├── lib/
│   │   ├── privateId/
│   │   │   ├── client.ts                 # PrivateID API client
│   │   │   ├── types.ts                  # TypeScript types
│   │   │   └── config.ts                 # API configuration
│   │   └── session/
│   │       ├── store.ts                  # In-memory session store
│   │       └── types.ts                  # Session types
│   └── components/
│       ├── PrivateIdIframe.tsx           # iFrame wrapper
│       └── ResultDisplay.tsx             # Results UI component
├── .env.local                            # Environment variables (gitignored)
├── .env.example                          # Example env file
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## API Endpoints

### `POST /api/sessions`

Create a new verification session.

**Request:**
```json
{
  "sessionType": "ENROLL" | "VERIFY",
  "flowType": "redirect" | "iframe",
  "baseUrl": "https://your-domain.com", // (optional - defaults to window.location.origin)
  "requirements": ["face", "identity_document"] // (optional - defaults based on sessionType)
}
```

**Requirements Options:**
- `["face"]` - Face verification only (suitable for VERIFY or quick ENROLL)
- `["identity_document"]` - Identity document only (less common)
- `["face", "identity_document"]` - Both face and document (recommended for ENROLL)
- If not provided, defaults to: ENROLL = both, VERIFY = face only

**Response:**
```json
{
  "sessionId": "uuid",
  "verificationUrl": "https://...",
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

### `GET /api/sessions/:sessionId`

Get session status (used by redirect flow for polling).

**Response:**
```json
{
  "sessionId": "uuid",
  "sessionType": "ENROLL",
  "status": "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED",
  "flowType": "redirect" | "iframe",
  "webhookData": {...}
}
```

### `GET /api/sessions/:sessionId/stream`

Server-Sent Events stream for real-time updates (used by iframe flow).

Returns SSE stream with session updates when webhook arrives.

### `POST /api/webhook`

Webhook endpoint for PrivateID callbacks.

**Request (from PrivateID):**
```json
{
  "sessionId": "uuid",
  "status": "SUCCESS" | "FAILED",
  "verificationResult": {...},
  "timestamp": "..."
}
```

## How It Works

### Redirect Flow

1. User selects verification requirements (Face, Identity Document, or both)
2. User clicks "Start Enrollment" or "Start Verify"
3. Client calls `POST /api/sessions` with `flowType: "redirect"` and selected requirements
4. Server creates session and gets verification URL from PrivateID
5. Browser redirects to PrivateID verification URL
6. User completes verification on PrivateID
7. PrivateID sends webhook to `/api/webhook`
8. Server stores webhook data in session
9. PrivateID redirects user back to `/redirect-flow/result?sessionId=xxx`
10. Result page polls `GET /api/sessions/:sessionId` every 2 seconds
11. Automatic fallback polling kicks in after 10 seconds if webhook delayed
12. Results display when webhook data is available

### iFrame Flow

1. User selects verification requirements (Face, Identity Document, or both)
2. User clicks "Start Enrollment" or "Start Verify"
3. Client calls `POST /api/sessions` with `flowType: "iframe"` and selected requirements
4. Server creates session and gets verification URL from PrivateID
5. Client renders iframe with verification URL
6. Client establishes SSE connection to `/api/sessions/:sessionId/stream`
7. User completes verification in iframe
8. PrivateID sends webhook to `/api/webhook`
9. Server updates session and notifies SSE listeners
10. Client receives SSE update and displays results instantly
11. No page refresh needed!

## Configurable Verification Requirements

Both flows support customizable verification requirements:

### Available Requirements

1. **Face Verification** (`face`)
   - Captures and verifies user's face biometrics
   - Required for both ENROLL and VERIFY flows
   - Can be used standalone for quick verification

2. **Identity Document** (`identity_document`)
   - Captures driver's license, passport, or government ID
   - Primarily used for ENROLL flows
   - Provides additional identity validation

### How to Configure

**In the UI:**
- Both redirect and iframe flows have checkboxes before starting verification
- Select "Face Verification" and/or "Identity Document"
- Current selection is displayed before starting

**Via API:**
```javascript
// Face only (quick verification)
fetch('/api/sessions', {
  method: 'POST',
  body: JSON.stringify({
    sessionType: 'VERIFY',
    flowType: 'iframe',
    requirements: ['face']
  })
});

// Face + Document (comprehensive enrollment)
fetch('/api/sessions', {
  method: 'POST',
  body: JSON.stringify({
    sessionType: 'ENROLL',
    flowType: 'redirect',
    requirements: ['face', 'identity_document']
  })
});
```

### Default Behavior

If `requirements` is not specified:
- **ENROLL**: Defaults to `['face', 'identity_document']` (comprehensive)
- **VERIFY**: Defaults to `['face']` (quick verification)

### Recommendations

- **New User Registration (ENROLL)**: Use both face + identity document for maximum security
- **Returning User Login (VERIFY)**: Use face only for quick, frictionless authentication
- **Custom Workflows**: Mix and match based on your security requirements

## Development

### Running Tests

```bash
npm run build    # Test production build
npm run lint     # Run ESLint
```

### Debugging

- Check Next.js console output for server-side logs
- Use ngrok inspector (`http://127.0.0.1:4040`) to inspect webhooks
- Check browser console for client-side logs
- Use `GET /api/sessions` to view all active sessions

### Common Issues

**Webhooks not arriving:**
- Make sure you're accessing the app via the ngrok URL (not localhost) when testing webhooks
- Check ngrok inspector (`http://127.0.0.1:4040`) to see if webhooks are being sent
- Verify your PrivateID API key is correct in `.env.local`
- Check server console logs for webhook processing messages

**SSE not updating:**
- Check browser console for SSE connection errors
- Ensure session exists before opening SSE stream
- Check server logs for listener subscription messages

**Session not found:**
- Sessions are stored in memory - restarting the server clears all sessions
- Use `GET /api/sessions` to verify session exists

## Environment Variables

### Development

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PRIVATEID_API_KEY` | PrivateID API key | ✅ Yes | - |
| `PRIVATEID_API_BASE` | PrivateID API base URL | No | `https://api-orchestration.uat.privateid.com/v2` |
| `BASE_URL` | Your app's base URL | No | Auto-detected via `window.location.origin` |
| `NODE_ENV` | Environment | No | `development` |

**Note**: The app automatically sends `window.location.origin` as the webhook URL, so you don't need to manually configure `BASE_URL` for local development with ngrok!

**Security Note**: Never commit API keys or secrets to version control. Use environment variables or secret management services (AWS Secrets Manager, Vercel Env Vars, etc.).

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 4+
- **State**: React hooks + Server-Sent Events
- **API**: Next.js API Routes
- **Session Store**: In-memory Map (demo) → Redis (production)

## License

This is a demo application. Refer to your PrivateID agreement for production usage terms.

## Support

For PrivateID API questions:
- Documentation: https://docs.privateid.com
- Support: Contact your PrivateID representative

For demo application issues:
- Check the troubleshooting section above
- Review server and browser console logs
- Verify ngrok tunnel is active (if testing webhooks)
- Access the app via the ngrok URL (not localhost) for webhook testing

## Next Steps

1. ✅ Test both flows (redirect and iframe)
2. ✅ Monitor webhooks via ngrok inspector
3. ✅ Understand the architecture differences
4. 🚀 Choose the best integration method for your use case
5. 🚀 Plan production deployment with persistent storage
6. 🚀 Add authentication and security measures
7. 🚀 Deploy to your production environment

---

## 📋 Key Takeaways for Clients

### What This Demo Shows You

✅ **Two integration patterns** - Choose between redirect or iframe based on your needs
✅ **Configurable verification** - Select face-only or face + document
✅ **Production-ready architecture** - Clear path from demo to production
✅ **Real-time updates** - SSE for instant results (iframe) or polling (redirect)
✅ **Webhook handling** - Secure server-side result processing

### What You Need to Do

1. **Choose your integration**: Redirect (simple) or iFrame (seamless UX)
2. **Copy relevant code**: Use this demo as a reference implementation
3. **Add persistence**: Replace in-memory store with Redis + Database
4. **Secure it**: Add authentication, webhook verification, rate limiting
5. **Test thoroughly**: Test both ENROLL and VERIFY flows
6. **Deploy**: Follow the production checklist above

### Quick Integration Steps

```bash
# 1. Clone/copy relevant files to your project
# 2. Install dependencies
npm install

# 3. Set environment variables
PRIVATEID_API_KEY=your-key
PRIVATEID_API_BASE=https://api-orchestration.privateid.com/v2

# 4. Implement these files in your project:
- src/lib/privateId/client.ts      # API client
- src/app/api/sessions/route.ts    # Session creation
- src/app/api/webhook/route.ts     # Webhook handler
- Choose: redirect-flow/* OR iframe-flow/*

# 5. Replace session store with Redis/PostgreSQL
# 6. Add authentication and security
# 7. Test and deploy
```

### Support & Resources

- **PrivateID Docs**: https://docs.privateid.com
- **This Demo**: Full working implementation with TypeScript
- **Production Checklist**: See "Pre-Production Checklist" above
- **Questions?**: Contact your PrivateID representative

---

**Happy integrating with PrivateID! 🎉**
