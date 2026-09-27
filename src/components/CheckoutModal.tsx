"use client";
import { getErrorMessage } from "@/lib/errors";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getDefaultAddress, normalizeSavedAddresses, type SavedAddressItem } from "@/lib/addressProfiles";
import {
  CustomerDetailsSchema,
  CustomerDetails,
} from "@/lib/schemas";
import { useAppSelector, useAppDispatch } from "@/store";
import { clearCart, toggleCartDrawer } from "@/store/slices/cartSlice";
import { generateWhatsAppOrderUrl } from "@/lib/whatsapp";
import { submitOrder } from "@/lib/api/orders";
import { site } from "@/lib/site";
import { Button, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, Textarea } from "@/components/ui";

export function CheckoutModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const { items } = useAppSelector((state) => state.cart);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{ orderId: string; totalAmount: number } | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [pricing, setPricing] = useState<{ subtotal: number; deliveryFee: number; couponDiscount: number; storeCreditApplied: number; grandTotal: number } | null>(null);
  const [useCredits, setUseCredits] = useState(false);
  // Reused across retries so a network hiccup cannot double-submit; reset on
  // success so a new checkout attempt gets a fresh key.
  const idempotencyKeyRef = useRef<string | null>(null);

  function checkoutIdempotencyKey(): string {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID().replace(/-/g, "")
          : `ck_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    }
    return idempotencyKeyRef.current;
  }

  const form = useForm<CustomerDetails>({
    resolver: zodResolver(CustomerDetailsSchema),
    defaultValues: {
      fullName: session?.user?.name ?? "",
      phoneNumber: session?.user?.phone ?? "",
      address: "",
      deliverySlot: "Evening (4 PM - 8 PM)",
      paymentMethod: "Cash on Delivery",
    },
  });

  const saveAddressPreset = async (label: "Home" | "Office" | "Other") => {
    const currentAddress = form.getValues("address").trim();
    if (!currentAddress) {
      setServerError("Please enter a delivery address before saving it.");
      return;
    }

    const nextList = normalizeSavedAddresses([
      ...savedAddresses,
      {
        id: `saved-${Date.now()}`,
        label,
        fullAddress: currentAddress,
        isDefault: savedAddresses.length === 0,
      },
    ]);

    const payload = {
      name: form.getValues("fullName").trim(),
      defaultAddress: currentAddress,
      savedAddresses: nextList,
    };

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as {
        success?: boolean;
        error?: string;
        data?: { savedAddresses?: SavedAddressItem[]; defaultAddress?: string | null };
      };
      if (!response.ok || !body.success) {
        throw new Error(body?.error || "Unable to save address.");
      }
      setSavedAddresses(normalizeSavedAddresses(body.data?.savedAddresses ?? nextList));
      form.setValue("address", body.data?.defaultAddress || currentAddress);
      setServerError(null);
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : "Unable to save address.");
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;

    let active = true;
    fetch("/api/account/profile")
      .then(async (response) => {
        const body = await response.json() as {
          success?: boolean;
          data?: {
            name?: string | null;
            phone?: string | null;
            defaultAddress?: string | null;
            savedAddresses?: SavedAddressItem[];
          };
        };
        if (!active || !response.ok || !body.success) return;

        const normalizedSaved = normalizeSavedAddresses(body.data?.savedAddresses ?? []);
        const defaultAddress = body.data?.defaultAddress || getDefaultAddress(normalizedSaved) || "";

        setSavedAddresses(normalizedSaved);
        form.reset({
          fullName: body.data?.name || session.user.name || "",
          phoneNumber: body.data?.phone || session.user.phone || "",
          address: defaultAddress,
          deliverySlot: form.getValues("deliverySlot") || "Evening (4 PM - 8 PM)",
          paymentMethod: form.getValues("paymentMethod") || "Cash on Delivery",
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [session?.user?.id, session?.user?.name, session?.user?.phone, form]);

  const { errors } = form.formState;

  async function previewCoupon() {
    if (!couponCode.trim() || items.length === 0) return;
    setCouponLoading(true);
    setCouponMessage(null);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, items: items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })) }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || "Coupon could not be applied.");
      setPricing(body.data.breakdown);
      setCouponMessage(`Coupon applied: ₹${body.data.breakdown.couponDiscount} saved`);
    } catch (error) {
      setPricing(null);
      setCouponMessage(error instanceof Error ? error.message : "Coupon could not be applied.");
    } finally {
      setCouponLoading(false);
    }
  }

  useEffect(() => {
    if (items.length === 0) setPricing(null);
  }, [items.length]);

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
      couponCode: couponCode.trim() || undefined,
      useCredits,
      idempotencyKey: checkoutIdempotencyKey(),
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
      // A fresh key for the next checkout flow
      idempotencyKeyRef.current = null;

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
          {site.fullName} — Direct WhatsApp Dispatch
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Saved addresses</span>
              <span className="text-[10px] text-slate-400">{savedAddresses.length} saved</span>
            </div>

            {savedAddresses.length > 0 ? (
              <div className="space-y-2">
                {savedAddresses.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => form.setValue("address", item.fullAddress)}
                    className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-sm transition hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-600"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400">{item.fullAddress}</p>
                    </div>
                    {item.isDefault && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">Default</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">No saved addresses yet. Save one below.</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {(["Home", "Office", "Other"] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => void saveAddressPreset(label)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
                >
                  Save as {label}
                </button>
              ))}
            </div>
          </div>

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

          <div className="border-t pt-4 dark:border-slate-800">
            <FormLabel>Coupon code</FormLabel>
            <div className="mt-1 flex gap-2">
              <Input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Enter code" maxLength={32} />
              <Button type="button" variant="secondary" onClick={previewCoupon} disabled={couponLoading || !couponCode.trim()}>{couponLoading ? "Checking…" : "Apply"}</Button>
            </div>
            {couponMessage && <p className={`mt-1 text-xs ${pricing ? "text-emerald-600" : "text-rose-500"}`}>{couponMessage}</p>}
          </div>

          {pricing && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{pricing.subtotal}</span></div>
              {pricing.deliveryFee > 0 && <div className="flex justify-between"><span>Delivery</span><span>₹{pricing.deliveryFee}</span></div>}
              {pricing.couponDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Coupon discount</span><span>-₹{pricing.couponDiscount}</span></div>}
              {pricing.storeCreditApplied > 0 && <div className="flex justify-between text-emerald-600"><span>Store credit</span><span>-₹{pricing.storeCreditApplied}</span></div>}
              <div className="mt-2 flex justify-between border-t pt-2 font-bold dark:border-slate-700"><span>Total</span><span>₹{pricing.grandTotal}</span></div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useCredits} onChange={(event) => setUseCredits(event.target.checked)} />
            Apply available store credit
          </label>

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