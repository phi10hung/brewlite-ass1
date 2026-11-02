export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type RefundStatus = "PENDING" | "SUCCESS" | "FAILED";

// Tên trạng thái dùng chung cho Lịch sử đơn, Chi tiết đơn và trang nhân viên,
// đặt theo chữ trên sơ đồ 9.1 của đề (barista nhận → pha xong → giao khách)
const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Chờ thanh toán",
    className: "bg-amber-100 text-amber-800",
  },
  PAYMENT_FAILED: {
    label: "Thanh toán lỗi",
    className: "bg-red-100 text-red-800",
  },
  PAID: {
    label: "Đã thanh toán",
    className: "bg-blue-100 text-blue-800",
  },
  PREPARING: {
    label: "Đã nhận, đang pha",
    className: "bg-purple-100 text-purple-800",
  },
  READY: {
    label: "Đã xong, chờ lấy",
    className: "bg-emerald-100 text-emerald-800",
  },
  COMPLETED: {
    label: "Đã giao",
    className: "bg-green-100 text-green-800",
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-stone-200 text-stone-700",
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

// Nhãn hoàn tiền cho đơn đã hủy sau khi thanh toán
export function getRefundLabel(refundStatus?: RefundStatus | null): string {
  if (refundStatus === "SUCCESS") return "Đã hoàn tiền";
  if (refundStatus === "PENDING" || refundStatus === "FAILED") {
    return "Đang hoàn tiền";
  }
  return "";
}
