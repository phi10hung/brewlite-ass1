
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  productId: number;
  name: string;
  imageUrl: string;
  size: "S" | "M" | "L";
  toppingIds: number[];
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

const sameToppingIds = (a: number[], b: number[]) =>
  [...a].sort((x, y) => x - y).join("|") ===
  [...b].sort((x, y) => x - y).join("|");

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
              sameToppingIds(current.toppingIds, item.toppingIds)
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

      updateQuantity: (productId, size, toppingIds, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter(
                  (item) =>
                    !(
                      item.productId === productId &&
                      item.size === size &&
                      sameToppings(item.toppingIds, toppingIds)
                    )
                )
              : state.items.map((item) =>
                  item.productId === productId &&
                  item.size === size &&
                  sameToppings(item.toppingIds, toppingIds)
                    ? { ...item, quantity: Math.floor(quantity) }
                    : item
                ),
        })),

      removeItem: (productId, size, toppingIds) =>
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(
                item.productId === productId &&
                item.size === size &&
                sameToppings(item.toppingIds, toppingIds)
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
