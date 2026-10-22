export interface Product {
  id: number;
  name: string;
  price: number;
  image?: string | null;
  category?: string;
}

export interface ProductDetail extends Product {
  description?: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: number;
  status: string;
  total: number;
  createdAt?: string;
}