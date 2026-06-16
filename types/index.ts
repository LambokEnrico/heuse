// ============================================
// SHARED ACTION TYPES
// ============================================

export type ActionSuccess<T> = {
  success: true;
  data: T;
};

export type ActionError = {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};

export type ActionResponse<T> = ActionSuccess<T> | ActionError;

// ============================================
// CART TYPES
// ============================================

export type CartItem = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  size: string;
  imageUrl: string;
  price: number;
  quantity: number;
};

export type CartStore = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalItems: () => number;
};

// ============================================
// PRODUCT TYPES
// ============================================

export type ProductWithRelations = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string | null;
  price: number;
  categoryId: string | null;
  dropId: string | null;
  editionLimit: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  drop: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null; sortOrder: number }[];
  variants: { id: string; size: string; stock: number }[];
  _count: { units: number; orderItems: number };
};

// ============================================
// ORDER TYPES
// ============================================

export type CheckoutCustomer = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode?: string;
  country: string;
};

export type CheckoutCartItem = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type OrderWithItems = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string | null;
  country: string;
  notes: string | null;
  subtotal: number;
  total: number;
  status: "PENDING_CONFIRMATION" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  fulfillmentStatus: "UNFULFILLED" | "PACKED" | "SHIPPED" | "DELIVERED";
  internalNote: string | null;
  items: {
    id: string;
    name: string;
    size: string;
    price: number;
    quantity: number;
    product: { name: string; slug: string } | null;
  }[];
  createdAt: Date;
};

// ============================================
// ADMIN TYPES
// ============================================

export type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  publishedProducts: number;
  totalUnits: number;
  availableUnits: number;
  waitlistLeads: number;
  newsletterSubscribers: number;
};

// ============================================
// WHATSAPP TYPES
// ============================================

export type WhatsAppTemplate = {
  orderNumber: string;
  customerName: string;
  items: { name: string; size: string; quantity: number; price: number }[];
  total: number;
  address: string;
};