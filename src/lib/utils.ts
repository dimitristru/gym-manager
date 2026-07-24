export const format = {
  date: (date: Date | string) =>
    new Date(date).toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  currency: (amount: number | string) =>
    new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(
      Number(amount)
    ),
};
