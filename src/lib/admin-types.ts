export type AdminCustomer = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: "user" | "admin";
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  orders: number;
  spent: number;
  repairs: number;
};
