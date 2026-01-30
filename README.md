# ��� BIZIE-AGENT

AI-powered business assistant for appointment booking and customer management.

## ⚠️ IMPORTANT SECURITY NOTES

### ��� API Key Security

**CRITICAL:** Your Gemini API key is currently exposed in the client-side code. This means anyone can:
- View your API key in browser DevTools
- Use your API quota
- Cost you money

### ���️ Recommended Security Architecture

```
┌─────────┐      ┌─────────────┐      ┌──────────┐
│ Browser │ ───► │ Your Backend│ ───► │ Gemini   │
│         │      │   (Node.js) │      │   API    │
└─────────┘      └─────────────┘      └──────────┘
                  ↑
                  API Key stored here
```

**TODO:** Create a backend API that:
1. Stores API key securely server-side
2. Accepts requests from your frontend
3. Forwards to Gemini API
4. Returns responses

## ��� Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local and add your keys
nano .env.local
```

### 3. Run Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

## ��� Project Structure

```
bizie-ai-business-sidekick/
├── components/          # React components
│   ├── Dashboard.tsx
│   ├── ChatWidget.tsx
│   ├── AppointmentsList.tsx
│   └── ...
├── services/           # External service integrations
│   ├── gemini.ts      # Gemini AI service
│   └── googleCalendar.ts
├── utils/             # Utility functions
│   └── validation.ts  # Input validation & sanitization
├── types.ts           # TypeScript type definitions
├── App.tsx            # Main application component
└── package.json
```

## ��� Recent Fixes (by Claude AI)

### ✅ Critical Bugs Fixed:
1. **gemini.ts line 73** - Fixed API key inconsistency
2. **Error handling** - Added try-catch blocks
3. **Validation** - Added input sanitization utilities
4. **Documentation** - Added JSDoc comments

### ���️ Security Improvements:
1. Created `.env.example` with security warnings
2. Added validation utilities for phone/email/name
3. Updated `.gitignore` to prevent key leaks
4. Added XSS prevention guidelines

## ��� TODO List

### ��� High Priority:
- [ ] Move API key to backend server
- [ ] Add input validation to all forms
- [ ] Add XSS protection (DOMPurify)
- [ ] Add Error Boundaries

### ��� Medium Priority:
- [ ] Extract hooks from App.tsx
- [ ] Add state management (Zustand)
- [ ] Replace localStorage with IndexedDB
- [ ] Add unit tests

### ��� Nice to Have:
- [ ] Add React.lazy for code splitting
- [ ] Add useMemo/useCallback optimizations
- [ ] Add debounce to input fields
- [ ] Add i18n support

## ��� Testing

```bash
# Run tests (once added)
npm test

# Run linter
npm run lint
```

## ��� License

Private project - All rights reserved

## ��� Contributing

This is a private business application. Contact the owner for access.

## ��� Support

For issues or questions, contact the development team.

---

**Last Updated:** 2026-01-30 by Claude AI
**Status:** ⚠️ Security improvements needed (see TODO)
