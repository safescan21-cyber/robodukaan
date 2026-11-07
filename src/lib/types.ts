export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  image_url: string | null;
  sort_order: number;
  hsn_code?: string | null;
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
  videos: string[];
  specs: Record<string, string>;
  faqs: Faq[];
  documents: ProductDocument[];
  warranty_months: number;
  hsn_code?: string | null;
  ready_to_dispatch: boolean;
  rating_avg: number;
  rating_count: number;
  sold_count: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  category?: (Pick<Category, "slug" | "name" | "icon"> & { hsn_code?: string | null }) | null;
  equivalents?: string | null;
};

export type Banner = {
  id: number;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  link: string;
  image_url: string | null;
  video_url: string | null;
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
  gst_rate?: number;
  gst_amount?: number;
  total: number;
  tracking_url: string | null;
  buyer_company?: string | null;
  buyer_gstin?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: number;
  product_id: string | null;
  name: string;
  sku: string;
  slug: string | null;
  hsn_code?: string | null;
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
  is_blocked: boolean;
  welcome_sent_at: string | null;
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

export type RepairStatus =
  | "new" | "reviewing" | "quoted" | "approved" | "in_repair" | "repaired" | "returned" | "rejected" | "cancelled";

export type RepairRequest = {
  id: string;
  request_number: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  board_type: string;
  device: string | null;
  problem: string;
  quantity: number;
  photos: string[];
  status: RepairStatus;
  quote_amount: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  urgent?: boolean;
  wants_exchange?: boolean;
};

export type Job = {
  id: string;
  slug: string;
  title: string;
  department: string | null;
  location: string;
  employment_type: string;
  experience: string | null;
  salary: string | null;
  description: string;
  requirements: string | null;
  is_open: boolean;
  created_at: string;
};

export type JobApplicationStatus = "new" | "shortlisted" | "interview" | "rejected" | "hired";

export type JobApplication = {
  id: string;
  job_id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  experience: string | null;
  message: string | null;
  resume_path: string | null;
  status: JobApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  job?: Pick<Job, "title" | "slug"> | null;
};

export type QuoteStatus = "new" | "quoted" | "won" | "lost";

export type QuoteRequest = {
  id: string;
  quote_number: string;
  user_id: string | null;
  product_id: string | null;
  product_name: string | null;
  quantity: number;
  name: string;
  company: string | null;
  gstin: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  message: string | null;
  status: QuoteStatus;
  quoted_amount: number | null;
  admin_notes: string | null;
  created_at: string;
};
