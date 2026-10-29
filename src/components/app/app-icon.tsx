'use client'
// Icon registry: maps icon names used in categories/goals to lucide components

import {
  UtensilsCrossed, ShoppingBasket, Car, ReceiptText, Home, ShoppingBag, Clapperboard, Repeat,
  HeartPulse, GraduationCap, Plane, Sparkles, Gift, CircleEllipsis, Banknote, Laptop, TrendingUp,
  Tag, Target, ShieldCheck, Wallet, PiggyBank, Coffee, Bus, Zap, Droplets, Wifi, Music, Gamepad2,
  BookOpen, Baby, Dog, Briefcase, Landmark, CreditCard, Smartphone, Shirt, Dumbbell, Stethoscope,
  Scissors, Popcorn, Trophy, Rocket, Sun, Umbrella, type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingBasket, Car, ReceiptText, Home, ShoppingBag, Clapperboard, Repeat,
  HeartPulse, GraduationCap, Plane, Sparkles, Gift, CircleEllipsis, Banknote, Laptop, TrendingUp,
  Tag, Target, ShieldCheck, Wallet, PiggyBank, Coffee, Bus, Zap, Droplets, Wifi, Music, Gamepad2,
  BookOpen, Baby, Dog, Briefcase, Landmark, CreditCard, Smartphone, Shirt, Dumbbell, Stethoscope,
  Scissors, Popcorn, Trophy, Rocket, Sun, Umbrella,
}

export const ICON_NAMES = Object.keys(ICONS)

export function AppIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICONS[name] ?? Tag
  return <Icon className={className} style={style} aria-hidden="true" />
}
