import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { CloudinaryImage } from "@/lib/schemas";

// New cart item shape: store IDs + minimal snapshot to keep localStorage small
export interface CartItem {
  productId: string;
  variantId?: string; // Track variant (e.g., "400ml", "1L", "2L")
  quantity: number;
  price: number; // snapshot of unit price at add-time
  name: string;
  unit: string;
  image?: string | CloudinaryImage;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

const initialState: CartState = {
  items: [],
  isOpen: false,
};

interface AddPayload {
  id?: string;
  productId?: string;
  product?: {
    id: string;
    price?: number;
    name?: string;
    unit?: string;
    image?: string | CloudinaryImage;
  };
  price?: number;
  name?: string;
  unit?: string;
  image?: string | CloudinaryImage;
  variantId?: string;
  quantity?: number;
}

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<AddPayload>) => {
      // Accept either a product-like object (legacy) or a minimal payload
      const payload = action.payload;
      const productId = payload.id || payload.productId || payload.product?.id;
      if (!productId) return;
      const quantity = payload.quantity ?? 1;
      const variantId = payload.variantId || undefined;

      // Find existing item with same productId AND variantId
      const existing = state.items.find(
        (it) => it.productId === productId && it.variantId === variantId
      );

      if (existing) {
        existing.quantity += quantity;
      } else {
        const item: CartItem = {
          productId,
          variantId,
          quantity,
          price: payload.price ?? payload.product?.price ?? 0,
          name: payload.name ?? payload.product?.name ?? "",
          unit: payload.unit ?? payload.product?.unit ?? "",
          image: payload.image ?? payload.product?.image,
        };
        state.items.push(item);
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      // Remove only the base product item (no variantId) — variant items use removeByVariantId
      state.items = state.items.filter(
        (item) => !(item.productId === action.payload && !item.variantId)
      );
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      // Update only the base product item (no variantId) — variant items use updateQuantityByVariant
      const { id: productId, quantity: newQuantity } = action.payload;
      const item = state.items.find(
        (item) => item.productId === productId && !item.variantId
      );
      if (item) {
        item.quantity = Math.max(1, newQuantity);
      }
    },
    updateQuantityByVariant: (state, action: PayloadAction<{ productId: string; variantId: string | undefined; quantity: number }>) => {
      const { productId, variantId, quantity } = action.payload;
      const item = state.items.find(
        (item) => item.productId === productId && item.variantId === variantId
      );
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
    },
    removeByVariantId: (state, action: PayloadAction<{ productId: string; variantId: string | undefined }>) => {
      state.items = state.items.filter(
        (it) => !(it.productId === action.payload.productId && it.variantId === action.payload.variantId)
      );
    },
    clearCart: (state) => {
      state.items = [];
    },
    toggleCartDrawer: (state, action: PayloadAction<boolean | undefined>) => {
      state.isOpen = action.payload ?? !state.isOpen;
    },
  },
});

export const { 
  addToCart, 
  removeFromCart, 
  updateQuantity, 
  updateQuantityByVariant, 
  clearCart, 
  toggleCartDrawer,
  removeByVariantId 
} = cartSlice.actions;

export default cartSlice.reducer;