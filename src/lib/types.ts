export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
};

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
  specs: Record<string, string>;
  is_featured: boolean;
  category?: Pick<Category, "slug" | "name" | "icon"> | null;
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
