export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  image_url: string | null;
  sort_order: number;
};

export type Faq = { q: string; a: string };
export type ProductDocument = { name: string; url: string };

export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: string | null;
  category_id: number;
  short_description: string | null;
  description: string | null;
  price: number;
  mrp: number | null;
  stock: number;
  image_url: string | null;
  images: string[];
  specs: Record<string, string>;
  faqs: Faq[];
  documents: ProductDocument[];
  warranty_months: number;
  ready_to_dispatch: boolean;
  rating_avg: number;
  rating_count: number;
  sold_count: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  category?: Pick<Category, "slug" | "name" | "icon"> | null;
};

export type Banner = {
  id: number;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  link: string;
  image_url: string | null;
  theme: "blue" | "orange" | "dark" | "green";
  sort_order: number;
  is_active: boolean;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  verified: boolean;
  is_hidden: boolean;
  created_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "flat";
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
};

export type OrderStatus = "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  notes: string | null;
  payment_method: string;
  payment_status: "pending" | "paid" | "refunded";
  status: OrderStatus;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping: number;
  total: number;
  tracking_url: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: number;
  product_id: string | null;
  name: string;
  sku: string;
  slug: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Address = {
  id: string;
  label: "Home" | "Office" | "Other";
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: "user" | "admin";
  created_at: string;
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  icon: string;
  imageUrl: string | null;
  stock: number;
  quantity: number;
};
