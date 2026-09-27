import { CartItem } from "@/store/slices/cartSlice";
import { CustomerDetails } from "./schemas";
import { site } from "./site";

export function generateWhatsAppHelpUrl(orderId?: string): string {
  const message = orderId
    ? `Hi ${site.name}! I need help with my order ${orderId}.`
    : `Hi ${site.name}! I need help with my order.`;
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppOrderUrl(
  items: CartItem[],
  customer: CustomerDetails
): string {
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const itemListFormatted = items
    .map(
      (item, index) =>
        `${index + 1}. *${item.name}* (${item.unit}) x ${item.quantity} = ₹${
          item.price * item.quantity
        }`
    )
    .join("\n");

  const message = `🛒 *NEW ORDER - ${site.fullName}*
----------------------------------------
👤 *Customer Information:*
*Name:* ${customer.fullName}
*Phone:* ${customer.phoneNumber}
*Address:* ${customer.address}
${customer.landmark ? `*Landmark:* ${customer.landmark}\n` : ""}*Delivery Slot:* ${customer.deliverySlot}
*Payment Preference:* ${customer.paymentMethod}

----------------------------------------
🛍️ *Order Summary:*
${itemListFormatted}

----------------------------------------
💰 *Total Payable:* ₹${subtotal}
----------------------------------------
_Please confirm my order and share delivery timing._`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${site.whatsappNumber}?text=${encodedMessage}`;
}
