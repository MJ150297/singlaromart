/**
 * Seed script — populates the `indiyano` database with sample categories,
 * products, banners, and offers.
 *
 * Images are sourced from LoremFlickr (CC-licensed, keyword-based) and uploaded
 * to Cloudinary so they match the app's structured Cloudinary image format.
 *
 * Idempotent: documents are skipped if their unique `id` already exists.
 *
 * Run with: `node --env-file=.env.local --import tsx scripts/seed.ts`
 */
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";
import { Banner } from "@/lib/models/Banner";
import { Offer } from "@/lib/models/Offer";
import {
  uploadBufferToCloudinary,
  type CloudinaryFolder,
} from "@/lib/cloudinary";
import type { CloudinaryImage } from "@/lib/schemas";

// ─── Config ───────────────────────────────────────────────────────────────────
const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 600;
const MAX_ATTEMPTS = 4;
const BACKOFF_MS = 3000;

// ─── Image helpers ────────────────────────────────────────────────────────────
interface SeedImage {
  keyword: string;
  lock: number;
  alt: string;
}

function loremFlickrUrl({ keyword, lock }: SeedImage): string {
  return `https://loremflickr.com/${IMAGE_WIDTH}/${IMAGE_HEIGHT}/${encodeURIComponent(
    keyword
  )}?lock=${lock}`;
}

async function fetchImageBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.arrayBuffer();
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS) throw err;
      console.log(
        `  ⏳ ${label} attempt ${attempt} failed (${(err as Error).message}); retrying in ${BACKOFF_MS / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, BACKOFF_MS));
    }
  }
  throw lastErr;
}

async function uploadSeedImage(
  img: SeedImage,
  folder: CloudinaryFolder
): Promise<CloudinaryImage> {
  const url = loremFlickrUrl(img);
  const buffer = await withRetry(
    () => fetchImageBuffer(url),
    `download ${img.keyword}`
  );
  return withRetry(
    () => uploadBufferToCloudinary(buffer, `${img.keyword}.jpg`, img.alt, folder),
    `upload ${img.keyword}`
  );
}

// ─── Seed data ────────────────────────────────────────────────────────────────
interface SeedSubcategory {
  id: string;
  name: string;
  slug: string;
  image: SeedImage;
}

interface SeedCategory {
  id: string;
  name: string;
  icon: string;
  image: SeedImage;
  subcategories: SeedSubcategory[];
}

const categories: SeedCategory[] = [
  {
    id: "cat-101",
    name: "Dairy Products",
    icon: "Milk",
    image: { keyword: "milk", lock: 1, alt: "Dairy Products" },
    subcategories: [
      { id: "sub-cat-101-1", name: "Milk", slug: "milk", image: { keyword: "milk", lock: 2, alt: "Milk" } },
      { id: "sub-cat-101-2", name: "Curd & Yogurt", slug: "curd-yogurt", image: { keyword: "yogurt", lock: 1, alt: "Curd & Yogurt" } },
      { id: "sub-cat-101-3", name: "Paneer & Cheese", slug: "paneer-cheese", image: { keyword: "cheese", lock: 1, alt: "Paneer & Cheese" } },
      { id: "sub-cat-101-4", name: "Butter & Ghee", slug: "butter-ghee", image: { keyword: "butter", lock: 1, alt: "Butter & Ghee" } },
    ],
  },
  {
    id: "cat-102",
    name: "Fruits & Vegetables",
    icon: "Apple",
    image: { keyword: "vegetables", lock: 1, alt: "Fruits & Vegetables" },
    subcategories: [
      { id: "sub-cat-102-1", name: "Fresh Fruits", slug: "fresh-fruits", image: { keyword: "fruits", lock: 1, alt: "Fresh Fruits" } },
      { id: "sub-cat-102-2", name: "Vegetables", slug: "vegetables", image: { keyword: "vegetables", lock: 2, alt: "Vegetables" } },
      { id: "sub-cat-102-3", name: "Leafy Greens", slug: "leafy-greens", image: { keyword: "spinach", lock: 1, alt: "Leafy Greens" } },
    ],
  },
  {
    id: "cat-103",
    name: "Staples & Grains",
    icon: "Wheat",
    image: { keyword: "rice", lock: 1, alt: "Staples & Grains" },
    subcategories: [
      { id: "sub-cat-103-1", name: "Rice", slug: "rice", image: { keyword: "rice", lock: 2, alt: "Rice" } },
      { id: "sub-cat-103-2", name: "Atta & Flour", slug: "atta-flour", image: { keyword: "flour", lock: 1, alt: "Atta & Flour" } },
      { id: "sub-cat-103-3", name: "Dal & Pulses", slug: "dal-pulses", image: { keyword: "lentils", lock: 1, alt: "Dal & Pulses" } },
      { id: "sub-cat-103-4", name: "Oils & Ghee", slug: "oils-ghee", image: { keyword: "oil", lock: 1, alt: "Oils & Ghee" } },
    ],
  },
  {
    id: "cat-104",
    name: "Snacks & Beverages",
    icon: "Cookie",
    image: { keyword: "snacks", lock: 1, alt: "Snacks & Beverages" },
    subcategories: [
      { id: "sub-cat-104-1", name: "Biscuits & Cookies", slug: "biscuits-cookies", image: { keyword: "biscuits", lock: 1, alt: "Biscuits & Cookies" } },
      { id: "sub-cat-104-2", name: "Chips & Namkeen", slug: "chips-namkeen", image: { keyword: "chips", lock: 1, alt: "Chips & Namkeen" } },
      { id: "sub-cat-104-3", name: "Juices & Drinks", slug: "juices-drinks", image: { keyword: "juice", lock: 1, alt: "Juices & Drinks" } },
      { id: "sub-cat-104-4", name: "Tea & Coffee", slug: "tea-coffee", image: { keyword: "tea", lock: 1, alt: "Tea & Coffee" } },
    ],
  },
  {
    id: "cat-105",
    name: "Personal Care",
    icon: "SprayCan",
    image: { keyword: "soap", lock: 1, alt: "Personal Care" },
    subcategories: [
      { id: "sub-cat-105-1", name: "Bath & Body", slug: "bath-body", image: { keyword: "soap", lock: 2, alt: "Bath & Body" } },
      { id: "sub-cat-105-2", name: "Oral Care", slug: "oral-care", image: { keyword: "toothpaste", lock: 1, alt: "Oral Care" } },
    ],
  },
];

interface SeedProduct {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  category: string;
  subcategoryId: string;
  subcategories: string[];
  price: number;
  unit: string;
  image: SeedImage;
  gallery: SeedImage[];
  inStock: boolean;
  description: string;
  origin: string;
  badges: string[];
  originalPrice?: number;
  discountPercent?: number;
  nutritionalInfo: string[];
  storageInfo: string;
  healthFact: string;
  variants: Array<{
    unit: string;
    price: number;
    originalPrice?: number;
    discountPercent?: number;
    inStock: boolean;
  }>;
  tags: string[];
  stockQuantity: number;
  isPublished: boolean;
}

const products: SeedProduct[] = [
  // ── Dairy ──
  {
    id: "ind-101",
    name: "Amul Taaza Toned Milk",
    slug: "amul-taaza-toned-milk",
    categoryId: "cat-101",
    category: "Dairy Products",
    subcategoryId: "sub-cat-101-1",
    subcategories: ["Milk"],
    price: 30,
    unit: "500ml",
    image: { keyword: "milk", lock: 3, alt: "Amul Taaza Toned Milk" },
    gallery: [
      { keyword: "milk", lock: 4, alt: "Amul Taaza Toned Milk" },
      { keyword: "milk", lock: 5, alt: "Amul Taaza Toned Milk" },
    ],
    inStock: true,
    description:
      "Fresh and creamy toned milk, pasteurized and packed daily for the whole family.",
    origin: "India",
    badges: ["Best Seller"],
    originalPrice: 32,
    discountPercent: 6,
    nutritionalInfo: ["3% fat", "8.5% SNF", "Rich in calcium"],
    storageInfo: "Keep refrigerated at 4°C. Consume within 2 days of opening.",
    healthFact: "A great source of calcium and protein for strong bones.",
    variants: [
      { unit: "500ml", price: 30, originalPrice: 32, discountPercent: 6, inStock: true },
      { unit: "1L", price: 58, originalPrice: 62, discountPercent: 6, inStock: true },
    ],
    tags: ["dairy", "milk", "bestseller"],
    stockQuantity: 120,
    isPublished: true,
  },
  {
    id: "ind-102",
    name: "Amul Fresh Curd",
    slug: "amul-fresh-curd",
    categoryId: "cat-101",
    category: "Dairy Products",
    subcategoryId: "sub-cat-101-2",
    subcategories: ["Curd & Yogurt"],
    price: 45,
    unit: "400g",
    image: { keyword: "yogurt", lock: 2, alt: "Amul Fresh Curd" },
    gallery: [{ keyword: "yogurt", lock: 3, alt: "Amul Fresh Curd" }],
    inStock: true,
    description:
      "Thick and creamy fresh curd made from pure milk. Perfect for everyday meals.",
    origin: "India",
    badges: ["Fresh"],
    originalPrice: 50,
    discountPercent: 10,
    nutritionalInfo: ["High in probiotics", "Rich in calcium"],
    storageInfo: "Keep refrigerated. Best consumed within 3 days.",
    healthFact: "Probiotics support a healthy gut and digestion.",
    variants: [
      { unit: "400g", price: 45, originalPrice: 50, discountPercent: 10, inStock: true },
      { unit: "1kg", price: 100, inStock: true },
    ],
    tags: ["dairy", "curd", "fresh"],
    stockQuantity: 80,
    isPublished: true,
  },
  {
    id: "ind-103",
    name: "Amul Fresh Paneer",
    slug: "amul-fresh-paneer",
    categoryId: "cat-101",
    category: "Dairy Products",
    subcategoryId: "sub-cat-101-3",
    subcategories: ["Paneer & Cheese"],
    price: 90,
    unit: "200g",
    image: { keyword: "cheese", lock: 2, alt: "Amul Fresh Paneer" },
    gallery: [{ keyword: "cheese", lock: 3, alt: "Amul Fresh Paneer" }],
    inStock: true,
    description:
      "Soft and fresh paneer, ideal for curries, grills, and snacks.",
    origin: "India",
    badges: ["High Protein"],
    originalPrice: 100,
    discountPercent: 10,
    nutritionalInfo: ["18g protein per 100g", "Rich in calcium"],
    storageInfo: "Keep refrigerated. Use within 5 days of opening.",
    healthFact: "Excellent vegetarian source of protein.",
    variants: [
      { unit: "200g", price: 90, originalPrice: 100, discountPercent: 10, inStock: true },
      { unit: "500g", price: 210, inStock: true },
    ],
    tags: ["dairy", "paneer", "protein"],
    stockQuantity: 60,
    isPublished: true,
  },
  {
    id: "ind-104",
    name: "Amul Butter",
    slug: "amul-butter",
    categoryId: "cat-101",
    category: "Dairy Products",
    subcategoryId: "sub-cat-101-4",
    subcategories: ["Butter & Ghee"],
    price: 56,
    unit: "100g",
    image: { keyword: "butter", lock: 2, alt: "Amul Butter" },
    gallery: [{ keyword: "butter", lock: 3, alt: "Amul Butter" }],
    inStock: true,
    description:
      "Creamy, salted butter made from fresh milk. Great for bread and cooking.",
    origin: "India",
    badges: ["Best Seller"],
    originalPrice: 60,
    discountPercent: 7,
    nutritionalInfo: ["80% milk fat", "No preservatives"],
    storageInfo: "Keep refrigerated.",
    healthFact: "A natural source of vitamins A, D, E, and K.",
    variants: [
      { unit: "100g", price: 56, originalPrice: 60, discountPercent: 7, inStock: true },
      { unit: "500g", price: 260, inStock: true },
    ],
    tags: ["dairy", "butter", "bestseller"],
    stockQuantity: 90,
    isPublished: true,
  },

  // ── Fruits & Vegetables ──
  {
    id: "ind-105",
    name: "Fresh Tomatoes",
    slug: "fresh-tomatoes",
    categoryId: "cat-102",
    category: "Fruits & Vegetables",
    subcategoryId: "sub-cat-102-2",
    subcategories: ["Vegetables"],
    price: 40,
    unit: "1kg",
    image: { keyword: "tomato", lock: 1, alt: "Fresh Tomatoes" },
    gallery: [{ keyword: "tomato", lock: 2, alt: "Fresh Tomatoes" }],
    inStock: true,
    description:
      "Juicy, farm-fresh tomatoes picked at peak ripeness.",
    origin: "Local Farm",
    badges: ["Farm Fresh"],
    nutritionalInfo: ["Rich in vitamin C", "High in lycopene"],
    storageInfo: "Store at room temperature, away from direct sunlight.",
    healthFact: "Lycopene supports heart health.",
    variants: [{ unit: "1kg", price: 40, inStock: true }],
    tags: ["vegetables", "fresh", "farm"],
    stockQuantity: 150,
    isPublished: true,
  },
  {
    id: "ind-106",
    name: "Red Onions",
    slug: "red-onions",
    categoryId: "cat-102",
    category: "Fruits & Vegetables",
    subcategoryId: "sub-cat-102-2",
    subcategories: ["Vegetables"],
    price: 35,
    unit: "1kg",
    image: { keyword: "onion", lock: 1, alt: "Red Onions" },
    gallery: [{ keyword: "onion", lock: 2, alt: "Red Onions" }],
    inStock: true,
    description: "Crisp red onions, a kitchen staple for every recipe.",
    origin: "Local Farm",
    badges: ["Farm Fresh"],
    nutritionalInfo: ["Rich in antioxidants"],
    storageInfo: "Store in a cool, dry place.",
    healthFact: "Antioxidants help reduce inflammation.",
    variants: [{ unit: "1kg", price: 35, inStock: true }],
    tags: ["vegetables", "fresh", "farm"],
    stockQuantity: 200,
    isPublished: true,
  },
  {
    id: "ind-107",
    name: "Bananas (Robusta)",
    slug: "bananas-robusta",
    categoryId: "cat-102",
    category: "Fruits & Vegetables",
    subcategoryId: "sub-cat-102-1",
    subcategories: ["Fresh Fruits"],
    price: 50,
    unit: "1 dozen",
    image: { keyword: "banana", lock: 1, alt: "Bananas" },
    gallery: [{ keyword: "banana", lock: 2, alt: "Bananas" }],
    inStock: true,
    description: "Sweet and ripe bananas, rich in potassium.",
    origin: "Local Farm",
    badges: ["Fresh"],
    nutritionalInfo: ["High in potassium", "Rich in vitamin B6"],
    storageInfo: "Store at room temperature.",
    healthFact: "Potassium supports healthy blood pressure.",
    variants: [{ unit: "1 dozen", price: 50, inStock: true }],
    tags: ["fruits", "fresh", "banana"],
    stockQuantity: 100,
    isPublished: true,
  },
  {
    id: "ind-108",
    name: "Shimla Apples",
    slug: "shimla-apples",
    categoryId: "cat-102",
    category: "Fruits & Vegetables",
    subcategoryId: "sub-cat-102-1",
    subcategories: ["Fresh Fruits"],
    price: 160,
    unit: "1kg",
    image: { keyword: "apple", lock: 1, alt: "Shimla Apples" },
    gallery: [{ keyword: "apple", lock: 2, alt: "Shimla Apples" }],
    inStock: true,
    description: "Crisp and juicy apples from the hills of Himachal.",
    origin: "Himachal Pradesh",
    badges: ["Premium"],
    originalPrice: 180,
    discountPercent: 11,
    nutritionalInfo: ["Rich in fiber", "High in vitamin C"],
    storageInfo: "Keep refrigerated for longer freshness.",
    healthFact: "Dietary fiber supports digestive health.",
    variants: [{ unit: "1kg", price: 160, originalPrice: 180, discountPercent: 11, inStock: true }],
    tags: ["fruits", "apple", "premium"],
    stockQuantity: 70,
    isPublished: true,
  },

  // ── Staples & Grains ──
  {
    id: "ind-109",
    name: "India Gate Basmati Rice",
    slug: "india-gate-basmati-rice",
    categoryId: "cat-103",
    category: "Staples & Grains",
    subcategoryId: "sub-cat-103-1",
    subcategories: ["Rice"],
    price: 145,
    unit: "1kg",
    image: { keyword: "rice", lock: 3, alt: "Basmati Rice" },
    gallery: [{ keyword: "rice", lock: 4, alt: "Basmati Rice" }],
    inStock: true,
    description:
      "Aged basmati rice with long, fluffy grains and a delightful aroma.",
    origin: "India",
    badges: ["Premium"],
    originalPrice: 160,
    discountPercent: 9,
    nutritionalInfo: ["Low glycemic index", "Gluten-free"],
    storageInfo: "Store in an airtight container in a cool, dry place.",
    healthFact: "Gluten-free and easy to digest.",
    variants: [
      { unit: "1kg", price: 145, originalPrice: 160, discountPercent: 9, inStock: true },
      { unit: "5kg", price: 690, inStock: true },
    ],
    tags: ["staples", "rice", "premium"],
    stockQuantity: 110,
    isPublished: true,
  },
  {
    id: "ind-110",
    name: "Aashirvaad Whole Wheat Atta",
    slug: "aashirvaad-whole-wheat-atta",
    categoryId: "cat-103",
    category: "Staples & Grains",
    subcategoryId: "sub-cat-103-2",
    subcategories: ["Atta & Flour"],
    price: 245,
    unit: "5kg",
    image: { keyword: "flour", lock: 2, alt: "Whole Wheat Atta" },
    gallery: [{ keyword: "flour", lock: 3, alt: "Whole Wheat Atta" }],
    inStock: true,
    description:
      "100% whole wheat atta for soft, fluffy rotis every time.",
    origin: "India",
    badges: ["Best Seller"],
    originalPrice: 260,
    discountPercent: 6,
    nutritionalInfo: ["High in fiber", "Whole grain"],
    storageInfo: "Store in an airtight container.",
    healthFact: "Whole grains support heart health.",
    variants: [
      { unit: "5kg", price: 245, originalPrice: 260, discountPercent: 6, inStock: true },
      { unit: "10kg", price: 470, inStock: true },
    ],
    tags: ["staples", "atta", "bestseller"],
    stockQuantity: 85,
    isPublished: true,
  },
  {
    id: "ind-111",
    name: "Toor Dal (Arhar)",
    slug: "toor-dal-arhar",
    categoryId: "cat-103",
    category: "Staples & Grains",
    subcategoryId: "sub-cat-103-3",
    subcategories: ["Dal & Pulses"],
    price: 130,
    unit: "1kg",
    image: { keyword: "lentils", lock: 2, alt: "Toor Dal" },
    gallery: [{ keyword: "lentils", lock: 3, alt: "Toor Dal" }],
    inStock: true,
    description:
      "Premium quality toor dal, perfect for dal tadka and sambar.",
    origin: "India",
    badges: ["High Protein"],
    nutritionalInfo: ["High in protein", "Rich in fiber"],
    storageInfo: "Store in an airtight container in a cool, dry place.",
    healthFact: "Plant-based protein supports muscle health.",
    variants: [{ unit: "1kg", price: 130, inStock: true }],
    tags: ["staples", "dal", "protein"],
    stockQuantity: 95,
    isPublished: true,
  },
  {
    id: "ind-112",
    name: "Fortune Sunflower Oil",
    slug: "fortune-sunflower-oil",
    categoryId: "cat-103",
    category: "Staples & Grains",
    subcategoryId: "sub-cat-103-4",
    subcategories: ["Oils & Ghee"],
    price: 175,
    unit: "1L",
    image: { keyword: "oil", lock: 2, alt: "Sunflower Oil" },
    gallery: [{ keyword: "oil", lock: 3, alt: "Sunflower Oil" }],
    inStock: true,
    description:
      "Light and healthy sunflower oil, ideal for everyday cooking.",
    origin: "India",
    badges: ["Heart Healthy"],
    originalPrice: 190,
    discountPercent: 8,
    nutritionalInfo: ["Rich in vitamin E", "Low in saturated fat"],
    storageInfo: "Store in a cool, dry place away from sunlight.",
    healthFact: "Vitamin E acts as an antioxidant.",
    variants: [
      { unit: "1L", price: 175, originalPrice: 190, discountPercent: 8, inStock: true },
      { unit: "5L", price: 840, inStock: true },
    ],
    tags: ["staples", "oil", "healthy"],
    stockQuantity: 75,
    isPublished: true,
  },

  // ── Snacks & Beverages ──
  {
    id: "ind-113",
    name: "Parle-G Biscuits",
    slug: "parle-g-biscuits",
    categoryId: "cat-104",
    category: "Snacks & Beverages",
    subcategoryId: "sub-cat-104-1",
    subcategories: ["Biscuits & Cookies"],
    price: 10,
    unit: "100g",
    image: { keyword: "biscuits", lock: 2, alt: "Parle-G Biscuits" },
    gallery: [{ keyword: "biscuits", lock: 3, alt: "Parle-G Biscuits" }],
    inStock: true,
    description:
      "The classic glucose biscuit loved by generations. Crunchy and delicious.",
    origin: "India",
    badges: ["Best Seller"],
    nutritionalInfo: ["Energy booster", "Low in cholesterol"],
    storageInfo: "Store in a cool, dry place.",
    healthFact: "A quick source of energy for the day.",
    variants: [
      { unit: "100g", price: 10, inStock: true },
      { unit: "1kg", price: 90, inStock: true },
    ],
    tags: ["snacks", "biscuits", "bestseller"],
    stockQuantity: 300,
    isPublished: true,
  },
  {
    id: "ind-114",
    name: "Lay's Classic Salted Chips",
    slug: "lays-classic-salted-chips",
    categoryId: "cat-104",
    category: "Snacks & Beverages",
    subcategoryId: "sub-cat-104-2",
    subcategories: ["Chips & Namkeen"],
    price: 20,
    unit: "52g",
    image: { keyword: "chips", lock: 2, alt: "Lay's Classic Salted Chips" },
    gallery: [{ keyword: "chips", lock: 3, alt: "Lay's Classic Salted Chips" }],
    inStock: true,
    description:
      "Crispy potato chips with the perfect touch of salt.",
    origin: "India",
    badges: ["New"],
    nutritionalInfo: ["Made from real potatoes"],
    storageInfo: "Store in a cool, dry place.",
    healthFact: "A tasty snack for movie nights.",
    variants: [
      { unit: "52g", price: 20, inStock: true },
      { unit: "120g", price: 45, inStock: true },
    ],
    tags: ["snacks", "chips", "new"],
    stockQuantity: 250,
    isPublished: true,
  },
  {
    id: "ind-115",
    name: "Real Mixed Fruit Juice",
    slug: "real-mixed-fruit-juice",
    categoryId: "cat-104",
    category: "Snacks & Beverages",
    subcategoryId: "sub-cat-104-3",
    subcategories: ["Juices & Drinks"],
    price: 95,
    unit: "1L",
    image: { keyword: "juice", lock: 2, alt: "Real Mixed Fruit Juice" },
    gallery: [{ keyword: "juice", lock: 3, alt: "Real Mixed Fruit Juice" }],
    inStock: true,
    description:
      "Refreshing mixed fruit juice made from real fruits. No added preservatives.",
    origin: "India",
    badges: ["No Preservatives"],
    originalPrice: 105,
    discountPercent: 10,
    nutritionalInfo: ["Rich in vitamin C", "No added preservatives"],
    storageInfo: "Refrigerate after opening. Consume within 3 days.",
    healthFact: "Vitamin C supports immunity.",
    variants: [{ unit: "1L", price: 95, originalPrice: 105, discountPercent: 10, inStock: true }],
    tags: ["beverages", "juice", "healthy"],
    stockQuantity: 65,
    isPublished: true,
  },
  {
    id: "ind-116",
    name: "Tata Tea Gold",
    slug: "tata-tea-gold",
    categoryId: "cat-104",
    category: "Snacks & Beverages",
    subcategoryId: "sub-cat-104-4",
    subcategories: ["Tea & Coffee"],
    price: 145,
    unit: "250g",
    image: { keyword: "tea", lock: 2, alt: "Tata Tea Gold" },
    gallery: [{ keyword: "tea", lock: 3, alt: "Tata Tea Gold" }],
    inStock: true,
    description:
      "Rich and aromatic tea blend for a perfect cup every morning.",
    origin: "India",
    badges: ["Premium"],
    originalPrice: 160,
    discountPercent: 9,
    nutritionalInfo: ["Rich in antioxidants"],
    storageInfo: "Store in an airtight container.",
    healthFact: "Antioxidants support overall wellness.",
    variants: [
      { unit: "250g", price: 145, originalPrice: 160, discountPercent: 9, inStock: true },
      { unit: "500g", price: 280, inStock: true },
    ],
    tags: ["beverages", "tea", "premium"],
    stockQuantity: 90,
    isPublished: true,
  },

  // ── Personal Care ──
  {
    id: "ind-117",
    name: "Dove Beauty Bar Soap",
    slug: "dove-beauty-bar-soap",
    categoryId: "cat-105",
    category: "Personal Care",
    subcategoryId: "sub-cat-105-1",
    subcategories: ["Bath & Body"],
    price: 85,
    unit: "100g x 3",
    image: { keyword: "soap", lock: 3, alt: "Dove Beauty Bar Soap" },
    gallery: [{ keyword: "soap", lock: 4, alt: "Dove Beauty Bar Soap" }],
    inStock: true,
    description:
      "Gentle moisturizing beauty bar that leaves skin soft and smooth.",
    origin: "India",
    badges: ["Moisturizing"],
    originalPrice: 95,
    discountPercent: 11,
    nutritionalInfo: [],
    storageInfo: "Store in a dry place.",
    healthFact: "Gentle on sensitive skin.",
    variants: [{ unit: "100g x 3", price: 85, originalPrice: 95, discountPercent: 11, inStock: true }],
    tags: ["personal-care", "soap", "bath"],
    stockQuantity: 140,
    isPublished: true,
  },
  {
    id: "ind-118",
    name: "Colgate MaxFresh Toothpaste",
    slug: "colgate-maxfresh-toothpaste",
    categoryId: "cat-105",
    category: "Personal Care",
    subcategoryId: "sub-cat-105-2",
    subcategories: ["Oral Care"],
    price: 55,
    unit: "150g",
    image: { keyword: "toothpaste", lock: 2, alt: "Colgate MaxFresh Toothpaste" },
    gallery: [{ keyword: "toothpaste", lock: 3, alt: "Colgate MaxFresh Toothpaste" }],
    inStock: true,
    description:
      "Fresh mint toothpaste for long-lasting fresh breath and strong teeth.",
    origin: "India",
    badges: ["Fresh Breath"],
    originalPrice: 60,
    discountPercent: 8,
    nutritionalInfo: [],
    storageInfo: "Store in a cool, dry place.",
    healthFact: "Fluoride helps prevent cavities.",
    variants: [
      { unit: "150g", price: 55, originalPrice: 60, discountPercent: 8, inStock: true },
      { unit: "300g", price: 100, inStock: true },
    ],
    tags: ["personal-care", "oral-care", "toothpaste"],
    stockQuantity: 160,
    isPublished: true,
  },
];

interface SeedBanner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  gradient: string;
  cta: string;
  image: SeedImage;
  order: number;
  isActive: boolean;
}

const banners: SeedBanner[] = [
  {
    id: "banner-101",
    title: "Fresh Dairy Delivered Daily",
    subtitle: "Milk, curd, paneer & more at your doorstep",
    badge: "NEW",
    gradient: "from-emerald-500 to-teal-600",
    cta: "Shop Dairy",
    image: { keyword: "milk", lock: 6, alt: "Fresh Dairy Delivered Daily" },
    order: 1,
    isActive: true,
  },
  {
    id: "banner-102",
    title: "Farm Fresh Fruits & Veggies",
    subtitle: "Straight from local farms to your kitchen",
    badge: "FRESH",
    gradient: "from-green-500 to-lime-600",
    cta: "Shop Fresh",
    image: { keyword: "vegetables", lock: 3, alt: "Farm Fresh Fruits & Veggies" },
    order: 2,
    isActive: true,
  },
  {
    id: "banner-103",
    title: "Big Savings on Staples",
    subtitle: "Rice, atta, dal & oils at unbeatable prices",
    badge: "SALE",
    gradient: "from-amber-500 to-orange-600",
    cta: "Shop Staples",
    image: { keyword: "rice", lock: 5, alt: "Big Savings on Staples" },
    order: 3,
    isActive: true,
  },
  {
    id: "banner-104",
    title: "Snack Time Favorites",
    subtitle: "Biscuits, chips & drinks for every craving",
    badge: "HOT",
    gradient: "from-rose-500 to-pink-600",
    cta: "Shop Snacks",
    image: { keyword: "snacks", lock: 2, alt: "Snack Time Favorites" },
    order: 4,
    isActive: true,
  },
];

interface SeedOffer {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: "tag" | "manual" | "category";
  tag?: string;
  productIds?: string[];
  categoryId?: string;
  bannerImage: SeedImage;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  sortOrder: number;
}

const now = new Date();
const offers: SeedOffer[] = [
  {
    id: "offer-101",
    name: "Dairy Essentials",
    slug: "dairy-essentials",
    description: "Everyday dairy products at great prices.",
    type: "category",
    categoryId: "cat-101",
    bannerImage: { keyword: "milk", lock: 7, alt: "Dairy Essentials" },
    startsAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "offer-102",
    name: "Best Sellers",
    slug: "best-sellers",
    description: "Our most-loved products, handpicked for you.",
    type: "tag",
    tag: "bestseller",
    bannerImage: { keyword: "shopping", lock: 1, alt: "Best Sellers" },
    startsAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "offer-103",
    name: "Fresh Picks",
    slug: "fresh-picks",
    description: "Farm-fresh fruits and vegetables, curated daily.",
    type: "manual",
    productIds: ["ind-105", "ind-106", "ind-107", "ind-108"],
    bannerImage: { keyword: "vegetables", lock: 4, alt: "Fresh Picks" },
    startsAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "offer-104",
    name: "Snack Attack",
    slug: "snack-attack",
    description: "Chips, biscuits, and drinks for your cravings.",
    type: "category",
    categoryId: "cat-104",
    bannerImage: { keyword: "snacks", lock: 3, alt: "Snack Attack" },
    startsAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    sortOrder: 4,
  },
];

// ─── Seeding logic ────────────────────────────────────────────────────────────
async function seedCategories(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const cat of categories) {
    const exists = await Category.findOne({ id: cat.id });
    if (exists) {
      skipped++;
      console.log(`  - Category ${cat.id} (${cat.name}): exists, skipping`);
      continue;
    }

    const image = await uploadSeedImage(cat.image, "categories");
    const subcategories = [];
    for (const sub of cat.subcategories) {
      const subImage = await uploadSeedImage(sub.image, "subcategories");
      subcategories.push({ id: sub.id, name: sub.name, slug: sub.slug, image: subImage });
    }

    await Category.create({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      image,
      subcategories,
    });
    inserted++;
    console.log(`  - Category ${cat.id} (${cat.name}): inserted`);
  }

  return { inserted, skipped };
}

async function seedProducts(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const p of products) {
    const exists = await Product.findOne({ id: p.id });
    if (exists) {
      skipped++;
      console.log(`  - Product ${p.id} (${p.name}): exists, skipping`);
      continue;
    }

    const image = await uploadSeedImage(p.image, "products");
    const images = [];
    for (const g of p.gallery) {
      images.push(await uploadSeedImage(g, "products"));
    }

    await Product.create({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      categoryId: p.categoryId,
      price: p.price,
      unit: p.unit,
      image,
      images,
      inStock: p.inStock,
      description: p.description,
      origin: p.origin,
      badges: p.badges,
      originalPrice: p.originalPrice,
      discountPercent: p.discountPercent,
      nutritionalInfo: p.nutritionalInfo,
      storageInfo: p.storageInfo,
      healthFact: p.healthFact,
      variants: p.variants,
      subcategories: p.subcategories,
      subcategoryId: p.subcategoryId,
      tags: p.tags,
      stockQuantity: p.stockQuantity,
      isPublished: p.isPublished,
    });
    inserted++;
    console.log(`  - Product ${p.id} (${p.name}): inserted`);
  }

  return { inserted, skipped };
}

async function seedBanners(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const b of banners) {
    const exists = await Banner.findOne({ id: b.id });
    if (exists) {
      skipped++;
      console.log(`  - Banner ${b.id} (${b.title}): exists, skipping`);
      continue;
    }

    const image = await uploadSeedImage(b.image, "banners");
    await Banner.create({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      badge: b.badge,
      gradient: b.gradient,
      cta: b.cta,
      image,
      order: b.order,
      isActive: b.isActive,
    });
    inserted++;
    console.log(`  - Banner ${b.id} (${b.title}): inserted`);
  }

  return { inserted, skipped };
}

async function seedOffers(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const o of offers) {
    const exists = await Offer.findOne({ id: o.id });
    if (exists) {
      skipped++;
      console.log(`  - Offer ${o.id} (${o.name}): exists, skipping`);
      continue;
    }

    const bannerImage = await uploadSeedImage(o.bannerImage, "offers");
    await Offer.create({
      id: o.id,
      name: o.name,
      slug: o.slug,
      description: o.description,
      type: o.type,
      tag: o.tag,
      productIds: o.productIds,
      categoryId: o.categoryId,
      bannerImage,
      startsAt: o.startsAt,
      endsAt: o.endsAt,
      isActive: o.isActive,
      sortOrder: o.sortOrder,
    });
    inserted++;
    console.log(`  - Offer ${o.id} (${o.name}): inserted`);
  }

  return { inserted, skipped };
}

async function main() {
  await connectToDatabase();
  console.log("🌱 Seeding database...\n");

  console.log("Categories:");
  const cat = await seedCategories();
  console.log(`  → ${cat.inserted} inserted, ${cat.skipped} skipped\n`);

  console.log("Products:");
  const prod = await seedProducts();
  console.log(`  → ${prod.inserted} inserted, ${prod.skipped} skipped\n`);

  console.log("Banners:");
  const ban = await seedBanners();
  console.log(`  → ${ban.inserted} inserted, ${ban.skipped} skipped\n`);

  console.log("Offers:");
  const off = await seedOffers();
  console.log(`  → ${off.inserted} inserted, ${off.skipped} skipped\n`);

  console.log("✅ Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});