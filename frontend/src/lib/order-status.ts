export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Chờ thanh toán",
    className: "bg-amber-100 text-amber-800",
  },
  PAID: {
    label: "Đã thanh toán",
    className: "bg-blue-100 text-blue-800",
  },
  PAYMENT_FAILED: {
    label: "Thanh toán thất bại",
    className: "bg-red-100 text-red-800",
  },
  PREPARING: {
    label: "Đang pha chế",
    className: "bg-purple-100 text-purple-800",
  },
  READY: {
    label: "Sẵn sàng",
    className: "bg-emerald-100 text-emerald-800",
  },
  COMPLETED: {
    label: "Hoàn tất",
    className: "bg-green-100 text-green-800",
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-red-100 text-red-800",
  },
};

export function getOrderStatus(status: string) {
  return (
    statusConfig[status as OrderStatus] ?? {
      label: status || "Không xác định",
      className: "bg-stone-100 text-stone-700",
    }
  );
}
