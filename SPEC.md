# HEUSE — Production Architecture Bible

> **HEUSE Official Website** — Luxury E-commerce + Limited Drop Catalog + Admin CMS
> Based on PRD v1.0 | Status: MVP BUILD IN PROGRESS

---

## 1. Concept & Vision

HEUSE is a **luxury menswear brand** specializing in handmade limited-edition jacquard jackets and bombers. The website embodies **quiet rebellion** — editorial, dark, masculine, and refined. Every pixel communicates scarcity and exclusivity. The experience feels like opening a premium fashion magazine, not shopping a generic e-commerce template.

**Tagline:** *True Self, Tailored.*

---

## 2. Design Language

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `heuse-black` | `#050505` | Main background, header, hero |
| `heuse-dark` | `#15110C` | Dark card background |
| `heuse-gold` | `#C9A24D` | Gold CTA, highlight, edition number |
| `heuse-crimson` | `#7A1E22` | Emotional accent, drop label |
| `heuse-cream` | `#F7F2EA` | Light editorial sections |
| `heuse-text` | `#F5F0E8` | Text on dark background |
| `heuse-text-dark` | `#171717` | Text on light background |
| `heuse-muted` | `#8B8174` | Secondary copy |
| `heuse-border` | `#2A241D` | Dark border, card outline |

### Typography

- **Heading:** `Cormorant Garamond` (serif, editorial luxury)
- **Body:** `Inter` (clean, readable)
- **CSS Variables:** `--font-heading`, `--font-body`

### Spatial System

- Generous whitespace — magazine-like spacing
- Border radius: `0.5rem` max (luxury feel)
- Subtle shadows (no heavy neumorphism)
- Motion: slow fade, reveal, hover zoom max 1.03x

### Visual Assets

- **Imagery:** Cinematic, close-up textures, dark studio lighting
- **Icons:** Minimal icon usage
- **Product textures:** Must be visually prioritized

---

## 3. Layout & Structure

### Public Routes

```
/                           → Homepage (hero, brand statement, active drop, featured)
/products                   → Product catalog (grid, filters, sort)
/products/[slug]            → Product detail (gallery, info, size selector, cart)
/drops                       → Limited drop archive
/drops/[slug]                → Specific drop page
/about                       → Brand manifesto, craft, identity
/contact                     → Contact form + WhatsApp CTA
/faq                         → FAQ accordion
/terms                       → Terms of service
/privacy                     → Privacy policy
/cart                        → Cart review
/checkout                    → Order reservation form
/checkout/success/[orderNumber] → Confirmation + WhatsApp CTA
```

### Admin Routes (Protected)

```
/admin/login                 → Admin authentication
/admin                       → Dashboard (stats, recent orders)
/admin/products              → Product management (table + CRUD)
/admin/products/new          → Create product
/admin/products/[id]         → Edit product + image manager + variants
/admin/categories            → Category management
/admin/drops                 → Drop management
/admin/orders                → Order list + filters
/admin/orders/[id]           → Order detail + status update
/admin/leads                 → Contact/waitlist leads
/admin/newsletter            → Newsletter subscribers
/admin/settings             → Brand config (Owner only)
```

---

## 4. Features & Interactions

### 4.1 Homepage
- Full-screen dark editorial hero with brand statement
- Active drop showcase with "Explore Drop" CTA
- Featured products grid
- Gold accent CTAs throughout
- Footer with newsletter signup

### 4.2 Product Catalog (`/products`)
- 3-col desktop, 2-col tablet, 1-col mobile grid
- Filter by: category, drop, availability
- Sort: newest, price low-high, price high-low, featured
- Product cards: image, name, drop, price, edition info, availability badge
- Empty state: "The next HEUSE drop is being tailored. Join the waitlist."
- Loading: Skeleton cards

### 4.3 Product Detail (`/products/[slug]`)
- Image gallery (sticky on desktop)
- Product name, drop name, price
- Short + full description, material notes
- Size selector (XS/S/M/L/XL/XXL/CUSTOM)
- Availability display (Available/Low Stock/Sold Out/Reserved)
- Edition count (e.g., "Limited to 20 pieces")
- Add to Cart button OR Join Waitlist button
- WhatsApp inquiry button
- Related products section

### 4.4 Cart
- Zustand store + localStorage persistence
- Add/update quantity/remove items
- Client-side subtotal calculation
- Empty state with CTA
- Sheet (mobile) / Page (desktop)

### 4.5 Checkout Reservation
- Customer form: fullName, email, phone, addressLine1, city, province, postalCode, country, notes
- Server-side validation with Zod
- Prisma transaction: create order + order items + reserve units
- Idempotency key to prevent duplicate submission
- Success page with order number + WhatsApp CTA

### 4.6 Admin CMS
- NextAuth CredentialsProvider login
- Dashboard with metrics: total orders, pending, products, subscribers
- Product CRUD with image upload (UploadThing)
- Variant + Edition Unit management (serial numbers)
- Order management with status update
- Lead/Newsletter management
- Settings page (Owner only)

### 4.7 Contact Form
- Fields: fullName, email, phone, subject, message
- Saves to ContactSubmission table
- Rate limited

### 4.8 Newsletter
- Email subscription
- Unique email constraint
- Source tracking (FOOTER/WAITLIST/CHECKOUT/POPUP)

### 4.9 Waitlist
- Collect: name, email, phone, productId/dropId, sizeInterest
- Admin can export leads

---

## 5. Component Inventory

### Public Components
| Component | States |
|-----------|--------|
| `Header` | default, scrolled, mobile-menu-open |
| `Footer` | default |
| `Hero` | default (full-screen dark) |
| `ProductCard` | default, hover, sold-out |
| `ProductGrid` | loading (skeleton), empty, populated |
| `ProductGallery` | default, lightbox |
| `SizeSelector` | available, low-stock, sold-out, selected |
| `AddToCartButton` | idle, loading, success, disabled |
| `CartSheet` | open, closed, empty |
| `CartItem` | default, updating, removing |
| `CheckoutForm` | idle, submitting, error, success |
| `OrderSuccess` | default |
| `WhatsAppButton` | default |
| `NewsletterForm` | idle, loading, success, error |
| `ContactForm` | idle, submitting, error, success |
| `Badge` | available, low-stock, sold-out, reserved |
| `Accordion` | collapsed, expanded |

### Admin Components
| Component | States |
|-----------|--------|
| `AdminSidebar` | collapsed, expanded |
| `AdminHeader` | default |
| `DataTable` | loading, empty, populated, error |
| `ProductForm` | create, edit, loading, error |
| `ImageUploader` | idle, uploading, success, error |
| `VariantManager` | default |
| `EditionUnitTable` | default |
| `OrderStatusForm` | default, updating |
| `OrderDetail` | default |
| `StatsCard` | loading, populated |

---

## 6. Technical Architecture

### Stack

```
Framework:     Next.js 15 (App Router)
Language:      TypeScript (strict mode)
Styling:       Tailwind CSS 3.4 + shadcn/ui
Database:      PostgreSQL (Railway Postgres / Supabase)
ORM:           Prisma 7.x (adapter pattern)
Auth:          NextAuth v5 (CredentialsProvider)
State:         Zustand (cart) + React Hook Form
Validation:    Zod
File Upload:   UploadThing
Email:         Resend (Phase 2)
Payment:       PayPal (sandbox for demo, live for production)
Deploy:        Railway (Docker build + standalone Next.js)
```

### Database Schema (Prisma)

**Enums:** UserRole, ProductStatus, SizeOption, EditionUnitStatus, OrderStatus, PaymentStatus, FulfillmentStatus, LeadStatus

**Models:** User, Account, Session, VerificationToken, Category, Drop, Product, ProductImage, ProductVariant, EditionUnit, Order, OrderItem, ContactSubmission, WaitlistEntry, NewsletterSubscriber, Page, Setting

### API Design (Server Actions)

All mutations through Server Actions in `app/actions/`:

| Action | Auth | Roles |
|--------|------|-------|
| `createProduct` | Yes | ADMIN, OWNER |
| `updateProduct` | Yes | ADMIN, OWNER |
| `deleteProduct` | Yes | OWNER |
| `createProductVariant` | Yes | ADMIN, OWNER |
| `updateProductVariant` | Yes | ADMIN, OWNER |
| `deleteProductVariant` | Yes | ADMIN, OWNER |
| `createEditionUnits` | Yes | ADMIN, OWNER |
| `reserveEditionUnit` | Yes | ADMIN, OWNER |
| `releaseEditionUnit` | Yes | ADMIN, OWNER |
| `addProductImage` | Yes | ADMIN, OWNER |
| `deleteProductImage` | Yes | ADMIN, OWNER |
| `reorderProductImages` | Yes | ADMIN, OWNER |
| `createOrder` | No | Public |
| `updateOrderStatus` | Yes | ADMIN, OWNER |
| `submitContactForm` | No | Public |
| `subscribeNewsletter` | No | Public |
| `joinWaitlist` | No | Public |
| `updateSettings` | Yes | OWNER |

### Response Type

```ts
type ActionSuccess<T> = { success: true; data: T };
type ActionError = { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
type ActionResponse<T> = ActionSuccess<T> | ActionError;
```

### Middleware

- Protects `/admin/:path*` routes
- Redirect to `/admin/login` if unauthenticated
- Redirect to `/unauthorized` if role insufficient

### Cache Strategy

- Public product pages: Static with `revalidatePath()`
- Admin pages: Dynamic
- Cart: localStorage + Zustand

---

## 7. Security

- Server-side authorization for all admin actions via `requireRole()`
- Zod validation for all external input
- No `any` types
- No secrets in client bundle
- Rate limiting on public forms
- File upload: jpg/png/webp only, max 5MB, max 12 per product
- Passwords hashed with bcrypt
- Prisma-only DB access (no direct Supabase client)

---

## 8. Environment Variables

```env
# Database
DATABASE_URL=
DIRECT_URL=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=

# Site
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_WHATSAPP_NUMBER=

# UploadThing
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=

# Email (Phase 2)
RESEND_API_KEY=

# Analytics
GOOGLE_ANALYTICS_ID=
META_PIXEL_ID=

# Payment (Phase 2)
# PayPal credentials — see PAYPAL-SETUP.md
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_DEFAULT_CURRENCY=IDR
PAYPAL_WEBHOOK_ID=
PAYPAL_WEBHOOK_SECRET=
```

---

## 9. Implementation Order

1. **Foundation:** Next.js + Tailwind + shadcn/ui + Prisma schema
2. **Auth:** NextAuth admin login + middleware
3. **Public Read:** Homepage, Products, Product Detail (Server Components)
4. **Admin CRUD:** Products, Categories, Drops, Orders
5. **Cart:** Zustand store + Cart page/sheet
6. **Checkout:** Server Action + Success page
7. **Features:** Contact, Newsletter, Waitlist
8. **Upload:** UploadThing image upload
9. **SEO:** Metadata, sitemap, robots, structured data
10. **Polish:** Loading states, empty states, error states, responsive
11. **Deploy:** Railway + PostgreSQL (Docker) + Environment variables + PayPal webhook

---

## 10. Acceptance Criteria

- [ ] Public pages render on desktop and mobile
- [ ] Homepage shows brand identity and active drop
- [ ] Product catalog shows only published products
- [ ] Product detail: gallery, size selector, availability
- [ ] Cart persists with localStorage
- [ ] Checkout validates all fields
- [ ] Checkout creates order via Prisma transaction
- [ ] No overselling of limited edition units
- [ ] Order success page with valid order number
- [ ] WhatsApp CTA generates prefilled message
- [ ] Admin routes protected with role-based access
- [ ] Admin can CRUD products, categories, drops
- [ ] Admin can update order status
- [ ] File uploads enforce type/size restrictions
- [ ] No TypeScript errors
- [ ] Build passes on Railway