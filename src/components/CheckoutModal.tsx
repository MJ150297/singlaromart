"use client";
import { getErrorMessage } from "@/lib/errors";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CustomerDetailsSchema,
  CustomerDetails,
} from "@/lib/schemas";
import { useAppSelector, useAppDispatch } from "@/store";
import { clearCart, toggleCartDrawer } from "@/store/slices/cartSlice";
import { generateWhatsAppOrderUrl } from "@/lib/whatsapp";
import { submitOrder } from "@/lib/api/orders";
import { Button, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, Textarea } from "@/components/ui";

export function CheckoutModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{ orderId: string; totalAmount: number } | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const form = useForm<CustomerDetails>({
    resolver: zodResolver(CustomerDetailsSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      address: "",
      deliverySlot: "Evening (4 PM - 8 PM)",
      paymentMethod: "Cash on Delivery",
    },
  });

  const { errors } = form.formState;

  const onSubmit = async (data: CustomerDetails) => {
    if (items.length === 0) {
      setServerError("Your cart is empty. Add items before submitting an order.");
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const orderPayload = {
      customer: data,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    };

    try {
      const response = await submitOrder(orderPayload);
      if (!response.success) {
        setServerError(response.error || "Unable to submit order.");
        setIsSubmitting(false);
        return;
      }

      const order = response.data;
      const whatsappLink = generateWhatsAppOrderUrl(items, data);
      setOrderResult({ orderId: order.orderId, totalAmount: order.totalAmount });
      setWhatsappUrl(whatsappLink);

      dispatch(clearCart());
      dispatch(toggleCartDrawer(false));
    } catch (error: unknown) {
      setServerError(getErrorMessage(error) || "Unable to submit order.");
      setIsSubmitting(false);
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderResult) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 w-16 h-16 mx-auto flex items-center justify-center text-3xl text-emerald-600">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Order Submitted
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Your order #{orderResult.orderId} has been received.
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
            Total payable: <span className="font-semibold">₹{orderResult.totalAmount}</span>
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {whatsappUrl && (
              <button
                type="button"
                onClick={() => window.open(whatsappUrl, "_blank")}
                className="w-full px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Confirm via WhatsApp
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-slate-100">
          Complete Order Details
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Indiyano Food & Baverages — Direct WhatsApp Dispatch
        </p>

        <Form form={form} onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Rahul Sharma" />
                </FormControl>
                <FormMessage>{errors.fullName?.message}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="10-digit mobile number" />
                </FormControl>
                <FormMessage>{errors.phoneNumber?.message}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Address</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="House/Flat No., Street, Area" />
                </FormControl>
                <FormMessage>{errors.address?.message}</FormMessage>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="deliverySlot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Slot</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</option>
                      <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                      <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                    </Select>
                  </FormControl>
                  <FormMessage>{errors.deliverySlot?.message}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="UPI on Delivery">UPI on Delivery</option>
                    </Select>
                  </FormControl>
                  <FormMessage>{errors.paymentMethod?.message}</FormMessage>
                </FormItem>
              )}
            />
          </div>

          {serverError && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? "Submitting order…" : "Send Order via WhatsApp"}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}