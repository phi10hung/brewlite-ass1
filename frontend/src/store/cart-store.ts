
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
    toppingIds: number[],
    quantity: number
  ) => void;
  removeItem: (
    productId: number,
    size: CartItem["size"],
    toppingIds: number[]
  ) => void;
  clear: () => void;
  totalItems: () => number;
  totalPrice: () => number;
};

// Backend chỉ nhận tối đa 20 ly mỗi dòng (create-order.dto.ts)
export const MAX_QUANTITY = 20;

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
                  ? {
                      ...current,
                      quantity: Math.min(
                        current.quantity + item.quantity,
                        MAX_QUANTITY
                      ),
                    }
                  : current
              ),
            };
          }

          return {
            items: [
              ...state.items,
              { ...item, quantity: Math.min(item.quantity, MAX_QUANTITY) },
            ],
          };
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
                      sameToppingIds(item.toppingIds, toppingIds)
                    )
                )
              : state.items.map((item) =>
                  item.productId === productId &&
                  item.size === size &&
                  sameToppingIds(item.toppingIds, toppingIds)
                    ? { ...item, quantity: Math.min(Math.floor(quantity), MAX_QUANTITY) }
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
                sameToppingIds(item.toppingIds, toppingIds)
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
      // Giỏ cũ (trước khi có toppingIds) không dùng được nữa → xoá trống
      version: 1,
      migrate: () => ({ items: [] }),
    }
  )
);
