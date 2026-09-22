import {
  Bed,
  Coffee,
  Crown,
  Dumbbell,
  Ear,
  Flame,
  Heart,
  Home,
  Leaf,
  Link2,
  LogOut,
  Map as MapIcon,
  MessageCircle,
  MessagesSquare,
  Search,
  Sofa,
  Star,
  Sun,
  Trophy,
  Users,
  Utensils,
  Waves,
  BookOpen,
  type LucideIcon,
} from "lucide-react"

const MAP: Record<string, LucideIcon> = {
  bed: Bed,
  coffee: Coffee,
  crown: Crown,
  dumbbell: Dumbbell,
  ear: Ear,
  flame: Flame,
  heart: Heart,
  home: Home,
  leaf: Leaf,
  link: Link2,
  "log-out": LogOut,
  map: MapIcon,
  "message-circle": MessageCircle,
  chat: MessagesSquare,
  search: Search,
  sofa: Sofa,
  star: Star,
  sun: Sun,
  trophy: Trophy,
  users: Users,
  utensils: Utensils,
  waves: Waves,
  book: BookOpen,
}

export function Icon({
  name,
  className,
  strokeWidth = 2,
}: {
  name: string
  className?: string
  strokeWidth?: number
}) {
  const Cmp = MAP[name] ?? Star
  return <Cmp className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}
