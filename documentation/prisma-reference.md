# Next.js with Prisma ORM Reference Guide

## Quick Setup

```bash
# Create Next.js app
npx create-next-app@latest my-app

# Install Prisma dependencies
npm install prisma --save-dev
npm install tsx --save-dev
npm install @prisma/extension-accelerate # Only for Prisma Postgres

# Initialize Prisma
npx prisma init
```

## Prisma Schema Example

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  authorId  Int
  author    User    @relation(fields: [authorId], references: [id])
}
```

## Database Connection

1. Store your connection string in `.env`:
   ```
   DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=your_api_key"
   ```

2. Apply schema to database:
   ```bash
   npx prisma migrate dev --name init
   ```

## Seeding Data

1. Create a seed file at `prisma/seed.ts`:

```typescript
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const userData: Prisma.UserCreateInput[] = [
  {
    name: 'Alice',
    email: 'alice@prisma.io',
    posts: {
      create: [
        {
          title: 'Join the Prisma Discord',
          content: 'https://pris.ly/discord',
          published: true,
        }
      ],
    },
  }
]

export async function main() {
  for (const u of userData) {
    await prisma.user.create({ data: u })
  }
}

main()
```

2. Add to `package.json`:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

3. Run seed command:
```bash
npx prisma db seed
```

## Prisma Client Setup

Create a singleton Prisma client to avoid multiple instances during hot-reloading:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = global as unknown as { prisma: typeof prisma }

const prisma = globalForPrisma.prisma || new PrismaClient().$extends(withAccelerate())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

For non-Prisma Postgres, use:
```typescript
const prisma = globalForPrisma.prisma || new PrismaClient()
```

## Basic Queries

### Get All Records

```typescript
// app/page.tsx
import prisma from '@/lib/prisma'

export default async function Home() {
  const users = await prisma.user.findMany();
  return (
    // JSX rendering users
  );
}
```

### Get Record with Relations

```typescript
const posts = await prisma.post.findMany({
  include: {
    author: true,
  },
});
```

### Get Single Record

```typescript
const post = await prisma.post.findUnique({
  where: { id: parseInt(id) },
  include: {
    author: true,
  },
});
```

### Create Record

```typescript
await prisma.post.create({
  data: {
    title,
    content,
    authorId: 1,
  },
});
```

## Next.js Server Actions with Prisma

```typescript
// app/posts/new/page.tsx
async function createPost(formData: FormData) {
  "use server";

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  await prisma.post.create({
    data: {
      title,
      content,
      authorId: 1,
    },
  });

  revalidatePath("/posts");
  redirect("/posts");
}
```

## Deployment Setup

Add a postinstall script to generate Prisma Client during deployment:

```json
// package.json
"scripts": {
  "postinstall": "prisma generate"
}
```

## Best Practices

### Monorepo Setup
- Centralize `schema.prisma` in a shared package
- Use custom output for generated client
- Install dependencies at root level
- Use NPM scripts for generation

### Dynamic Client Creation

```typescript
// For tenant-specific or dynamic database scenarios
function createPrismaClient(config: { databaseUrl: string }): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
  });
}
```

## Common Commands

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio

# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration_name>

# Apply migrations in production
npx prisma migrate deploy
```