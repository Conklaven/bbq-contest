This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

Create a `.env.local` file in the root directory with the following Firebase configuration:

**Important:** Never commit your actual Firebase keys to version control. The `.env.local` file is already in `.gitignore`.

### Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Firebase Setup

This project uses Firebase for:

- Authentication
- Firestore Database
- Analytics

Firebase is configured in `src/lib/firebase.ts` and automatically initializes the necessary services.

### Database Collections

The application uses the following Firestore collections:

- **Teams**: `{ id, name, categories: ["Brisket",...] }`
- **Items**: `{ id, teamId, category, itemCode }`
- **Judges**: `{ uid, displayName }`
- **Scores**: `{ itemId, judgeId, taste, tenderness, appearance, createdAt }`

### Security Rules

Firebase security rules are defined in `firestore.rules`:

- **Teams**: Can read their own documents and scores only
- **Judges**: Can write scores but cannot read team names
- **Admins**: Have full access to all collections

The rules use custom claims (`isAdmin`, `isJudge`, `isTeam`) for role-based access control.

### Database Helper

The `src/lib/db.ts` file provides:

- Type-safe database operations
- Firestore converters for proper data typing
- Helper methods for common queries

### Seed Script

To populate the database with sample data:

```bash
npm run seed
```

This will create:

- 5 sample teams with different BBQ categories
- Items for each team with unique 6-character codes (for QR codes)
- 4 sample judges

**Note**: You'll need to set up Firebase Admin SDK credentials to run the seed script.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Vercel Environment Variables

Make sure to add the same Firebase environment variables in your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add all the `NEXT_PUBLIC_FIREBASE_*` variables with your actual values

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
