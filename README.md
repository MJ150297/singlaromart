# Indiyano Website

A modern grocery and beverage storefront built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, **React Hook Form + Zod**, and **Redux Toolkit**.

## Overview

This project is a full-stack e-commerce application with:

- Product browsing with category and search support
- Cart management and persistent checkout flow
- Admin signup and login via **NextAuth Credentials**
- Order creation and confirmation
- Custom shadcn-style UI primitives
- MongoDB-backed user and order persistence
- Cloudinary-compatible image configuration

## Architecture

### Frontend

- **Next.js App Router** for routes and nested layouts
- **React 19** with **TypeScript**
- **Tailwind CSS v4** for utility styling
- **Redux Toolkit** with `redux-persist` for cart state
- **React Hook Form** + **Zod** for client-side validation
- Custom UI primitives in `src/components/ui`

### Backend & API

- Next.js route handlers under `src/app/api`
- Authentication powered by `next-auth`
- Credential login with password hashing via `bcryptjs`
- MongoDB data models with Mongoose
- Order creation and admin signup endpoints

### Data Layer

- Static catalog support via `src/lib/catalog.ts`
- API client helper in `src/lib/api/client.ts`
- Zod schema definitions in `src/lib/schemas.ts`

## Project Structure

```text
src/
  app/
    layout.tsx
    page.tsx
    category/[id]/page.tsx
    product/[id]/page.tsx
    search/page.tsx
    admin/(auth)/signup/page.tsx
    admin/(auth)/login/page.tsx
    admin/(dashboard)/dashboard/page.tsx
    api/
      auth/signup/route.ts
      orders/route.ts
      ...
  components/
    CheckoutModal.tsx
    CartDrawer.tsx
    CartFloatingBar.tsx
    Header.tsx
    ProductGrid.tsx
    ...
  components/ui/
    button.tsx
    input.tsx
    textarea.tsx
    select.tsx
    label.tsx
    form.tsx
    form-field.tsx
    form-item.tsx
    form-control.tsx
    form-message.tsx
    utils.ts
  lib/
    api/
      client.ts
      products.ts
      orders.ts
    auth/guard.ts
    config.ts
    schemas.ts
    catalog.ts
    whatsapp.ts
    models/
      User.ts
      Order.ts
      Product.ts
      Category.ts
      Banner.ts
    db/mongoose.ts
  store/
    index.ts
    provider.tsx
    slices/cartSlice.ts
  data/
    categories.json
    products.json
    heroSlides.json
  hooks/
    useInfiniteScroll.ts

next.config.ts
package.json
postcss.config.mjs
README.md
```

## Getting Started

### Install

```bash
npm install
```

### Environment Variables

Create `.env.local` with these keys:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
MONGODB_URI=mongodb://localhost:27017/indiyano
NEXTAUTH_SECRET=your-secret-value
NEXTAUTH_URL=http://localhost:3000
ADMIN_SETUP_TOKEN=your-setup-token
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
NEXT_PUBLIC_WHATSAPP_NUMBER=919876543210
```

### Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the storefront.

### Build for Production

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev` - run development server
- `npm run build` - build production app
- `npm run start` - start built app
- `npm run lint` - run ESLint
- `npm run seed` - run seed script if available

## Core Features

### Storefront

- Hero carousel and seasonal offers
- Search-enabled product listing
- Category browsing with dynamic category pages
- Product details pages with image gallery and variants
- Responsive header and mobile navigation

### Cart & Checkout

- Cart drawer on desktop
- Floating checkout bar on mobile
- Persistent cart state via Redux Persist
- Checkout modal with form validation
- Order submission through `/api/orders`
- WhatsApp order confirmation option

### Admin

- Admin signup and login pages
- Owner setup protected by `ADMIN_SETUP_TOKEN`
- Admin dashboard routes under `src/app/admin/(dashboard)`
- Protected auth flow using `next-auth`

## Data & Validation

### Zod Schemas

`src/lib/schemas.ts` contains validation for:

- products
- customer checkout
- admin signup
- Cloudinary image shapes
- product query filters

### Cart State

`src/store/slices/cartSlice.ts` implements:

- `addToCart`
- `removeFromCart`
- `updateQuantity`
- `clearCart`
- `toggleCartDrawer`

### API Client

`src/lib/api/client.ts` provides `fetchJson<T>()` and centralized error handling.

## UI Components

The app includes shadcn-style primitives in `src/components/ui/`:

- `Button`
- `Input`
- `Textarea`
- `Select`
- `Label`
- `Form`
- `FormField`
- `FormItem`
- `FormControl`
- `FormMessage`
- `cn` helper

These components are used in form screens such as checkout and signup.

## Authentication

### NextAuth Setup

`src/auth.ts` configures NextAuth with:

- Credentials provider
- bcrypt password comparison
- JWT session strategy
- login rate limiting
- custom `signIn` and `session` callbacks

### Admin Signup

`src/app/api/auth/signup/route.ts` handles registration with:

- rate limiting
- password hashing
- owner role validation
- MongoDB user creation

## API Endpoints

- `POST /api/auth/signup` - register a new user
- `POST /api/orders` - create an order
- `GET /api/products` - fetch products
- `GET /api/products/:id` - fetch a product
- `GET /api/categories` - fetch categories
- `POST /api/admin/...` - admin resources

## Cloudinary and Images

`next.config.ts` allows images from `res.cloudinary.com`.

## Cloudinary and Images

The app is configured for **Cloudinary image hosting** but upload functionality is not yet implemented. 

**Current state:**
- ✅ Remote patterns configured in `next.config.ts`
- ✅ Zod schema with transformation support
- ✅ ProductImage component supports Cloudinary objects
- ❌ Upload API endpoint missing
- ❌ Admin upload UI not implemented

**To implement Cloudinary uploads:**

See [docs/CLOUDINARY_IMPLEMENTATION.md](docs/CLOUDINARY_IMPLEMENTATION.md) for a complete 7-phase implementation plan including:
- Server-side upload API
- Admin upload UI
- Database migration
- Transformation optimization
- Error handling
- Testing strategy

**Quick setup:**
1. Get Cloudinary credentials from [cloudinary.com](https://cloudinary.com)
2. Set in `.env.local`:
   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```
3. Follow the implementation plan phases

## Notes

- The app currently uses a static catalog shim for products.
- The checkout flow includes WhatsApp URL generation via `src/lib/whatsapp.ts`.
- Admin login and protected routes are implemented via NextAuth.
- Dark mode is applied using `localStorage` and `prefers-color-scheme` in `src/app/layout.tsx`.

## Future Improvements

- Convert catalog data to a real backend product API
- Add customer order history pages
- Add pagination and sorting for product listings
- Add payment gateway integration
- Add admin product/category management UI
- Add full test coverage
