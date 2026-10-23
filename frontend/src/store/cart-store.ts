
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  productId: number;
  name: string;
  imageUrl: string;
  size: "S" | "M" | "L";
  toppings: string[];
  unitPrice: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (
    productId: number,
    size: CartItem["size"],
    toppings: string[],
    quantity: number
  ) => void;
  removeItem: (
    productId: number,
    size: CartItem["size"],
    toppings: string[]
  ) => void;
  clear: () => void;
  totalItems: () => number;
  totalPrice: () => number;
};

const sameToppings = (a: string[], b: string[]) =>
  [...a].sort().join("|") === [...b].sort().join("|");

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (current) =>
              current.productId === item.productId &&
              current.size === item.size &&
              sameToppings(current.toppings, item.toppings)
          );

          if (existing) {
            return {
              items: state.items.map((current) =>
                current === existing
                  ? { ...current, quantity: current.quantity + item.quantity }
                  : current
              ),
            };
          }

          return { items: [...state.items, { ...item }] };
        }),

      updateQuantity: (productId, size, toppings, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter(
                  (item) =>
                    !(
                      item.productId === productId &&
                      item.size === size &&
                      sameToppings(item.toppings, toppings)
                    )
                )
              : state.items.map((item) =>
                  item.productId === productId &&
                  item.size === size &&
                  sameToppings(item.toppings, toppings)
                    ? { ...item, quantity: Math.floor(quantity) }
                    : item
                ),
        })),

      removeItem: (productId, size, toppings) =>
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(
                item.productId === productId &&
                item.size === size &&
                sameToppings(item.toppings, toppings)
              )
          ),
        })),

      clear: () => set({ items: [] }),

totalItems: () =>
  get().items.reduce(
    (total, item) => total + item.quantity,
    0
  ),

totalPrice: () =>
  get().items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  ),
}),
{
  name: "brewlite-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
