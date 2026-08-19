import {
  Milk,
  Apple,
  Wheat,
  Cookie,
  SprayCan,
  Package,
  ShoppingBag,
  Leaf,
  Carrot,
  Droplets,
  Utensils,
  Coffee,
  Shirt,
  Heart,
  Home,
  Search,
  Star,
  Truck,
  Bike,
  Store,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Milk,
  Apple,
  Wheat,
  Cookie,
  SprayCan,
  Package,
  ShoppingBag,
  Leaf,
  Carrot,
  Droplets,
  Utensils,
  Coffee,
  Shirt,
  Heart,
  Home,
  Search,
  Star,
  Truck,
  Bike,
  Store,
};

export function CategoryIcon({
  name,
  className = "w-4 h-4",
}: {
  name?: string;
  className?: string;
}) {
  const Icon = (name && iconMap[name]) || Package;
  return <Icon className={className} />;
}