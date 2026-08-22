import "leaflet/dist/leaflet.css";
import "./index.css";
/* ================================================================
   VIBE PASS — unified super-app shell
   Public Landing Page (marketing surface + Auth/KYC) gates entry into
   the app shell: Consumer Hub (event discovery + ticketing), Talent
   Hub (verification wizard + performer dashboard), and Promoter Hub
   (venue/event management + Post Event flow) — three role-gated hubs
   sharing one status bar, one splash intro, and one hub switcher.
   Fiat/AED only — no crypto or wallet-connect logic anywhere in this
   file, per DCT Abu Dhabi + UAE Pass compliance requirements.
   ================================================================ */
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
  Fragment,
} from "react";
import {
  MapPin,
  Ticket,
  Compass,
  User,
  X,
  Calendar,
  Clock,
  ShieldCheck,
  Wifi,
  Signal,
  Battery,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  BadgeCheck,
  Lock,
  RefreshCw,
  Sparkles,
  Users,
  Star,
  Banknote,
  UtensilsCrossed,
  Navigation,
  CalendarCheck,
  Minus,
  Plus,
  List,
  Check,
  Loader2,
  Fingerprint,
  CreditCard,
  UploadCloud,
  FileText,
  Briefcase,
  Building2,
  RotateCcw,
  AlertCircle,
  Home,
  CalendarDays,
  Wallet,
  Wallet as WalletIcon,
  TrendingUp,
  Share2,
  Copy,
  Zap,
  Moon,
  Gift,
  Crown,
  Award,
  UserPlus,
  ThumbsUp,
  Percent,
  ArrowUpRight,
  Flame,
  Music2,
  Mic2,
  Megaphone,
  PartyPopper,
  Link2,
  ArrowRight,
  CheckCircle2,
  Gem,
  Heart,
  Landmark,
  Mail,
  Menu,
  Search,
  Phone,
  Coffee,
  Sun,
  Waves,
  AlertTriangle,
  ArrowLeft,
  Handshake,
  Trophy,
  Upload,
  Wine,
  Music,
  ShieldAlert,
  Repeat2,
  MessageCircle,
  Send,
  Bookmark,
  BarChart3,
} from "lucide-react";
import L from "leaflet";
import { createRoot } from "react-dom/client";

/* ============================================================
   DESIGN TOKENS - shared Vibe Pass corporate dark scheme
   "Midnight Obsidian" background, Electric Emerald + Neon
   Amethyst accents. Union of both source files' token sets.
   ============================================================ */
const C = {
  bg: "#0A0A0C",
  surface: "#111318",
  surfaceHi: "#171A21",
  /* Lifted from #23262F. At that value an outline was barely a shade above
     the surface it sat on, so panels read as floating shapes rather than
     defined boxes. This is the single highest-leverage colour in the app:
     140 call sites reference it, so every card, sheet and input gains a
     visible edge from one change. Still neutral-cool — it defines shape
     without competing with the emerald and amethyst accents. */
  line: "#343A4D",
  textHi: "#F5F6F8",
  textMid: "#9CA3AF",
  textLo: "#6B7280",
  emerald: "#22C55E", // Electric Emerald
  amethyst: "#A855F7", // Neon Amethyst
  gold: "#F5B942",
  danger: "#F87171",
  borderFaint: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  emeraldDim: "rgba(34,197,94,0.12)",
  amethystDim: "rgba(168,85,247,0.12)",
};

const focusRing = "focus:outline-none focus:ring-2 focus:ring-purple-400";
const INITIAL_CENTER = [24.494, 54.395];
const SHIFT_THRESHOLD_M = 250;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "sports", label: "Sports" },
  { id: "esports", label: "E-Sports" },
  { id: "theaters", label: "Musical Theaters" },
  { id: "tourist", label: "Tourist Spots" },
  { id: "concerts", label: "Concerts" },
  { id: "nightlife", label: "Nightlife" },
  { id: "dining", label: "Dining" },
  { id: "cafes", label: "Cafés" },
  { id: "comedy", label: "Comedy" },
  { id: "arts", label: "Arts & Exhibitions" },
  { id: "business", label: "Business & Networking" },
  { id: "fashion", label: "Fashion" },
  { id: "wellness", label: "Wellness & Fitness" },
  { id: "family", label: "Family & Kids" },
  { id: "workshops", label: "Workshops & Classes" },
  { id: "wide", label: "General" },
];

const CATEGORY_LABELS = {
  concerts: "Concerts",
  sports: "Sports",
  esports: "E-Sports",
  theaters: "Musical Theater",
  tourist: "Tourist Spot",
  nightlife: "Nightlife",
  dining: "Dining",
  cafes: "Café",
  comedy: "Comedy",
  arts: "Arts & Exhibitions",
  business: "Business & Networking",
  fashion: "Fashion",
  wellness: "Wellness & Fitness",
  family: "Family & Kids",
  workshops: "Workshops & Classes",
  wide: "General",
};

/* Batch 4 - Consumer Tab spec alignment.
"Choosing 'Consumer' assigns a specific metadata tag or 'role' (e.g.,
role: consumer) to that user's account profile." This is a UI-only mock
(no backend/auth in this file) but the role tag is real and drives the
nav filtering below, not just decorative copy. */
const CURRENT_USER = {
  name: "Andy",
  role: "consumer",
  uaePassVerified: true,
  emiratesIdSuffix: "7734",
};

/* "The app's navigation bar will only display consumer-facing tabs (like
Feed, Map, Tickets, and Profile)... If user role is 'promoter', show the
Promoter Hub button. If it is 'consumer', hide it entirely." Each item
declares which roles can see it; BottomNav filters this list by the
signed-in role so a non-consumer item never mounts (not just hidden via
CSS). NOTE: this is the client-side half of the pattern only - it is a
navigation/UX convenience, not a security boundary. The spec is explicit
that real enforcement (RBAC, 403 Forbidden on cross-role requests) lives
on the server, which is out of scope for this front-end file. */
const CONSUMER_NAV_ITEMS = [
  { id: "feed", label: "Feed", icon: List, roles: ["consumer"] },
  { id: "map", label: "Map", icon: MapPin, roles: ["consumer"] },
  { id: "search", label: "Search", icon: Search, roles: ["consumer"] },
  { id: "tickets", label: "Tickets", icon: Ticket, roles: ["consumer"] },
  { id: "profile", label: "Profile", icon: User, roles: ["consumer"] },
];

/* Embedded vector basemap - CSP-safe fallback geography */

const DISTRICT_ZONES = [
  {
    id: "yas",
    name: "Yas Island",
    color: C.amethyst,
    ring: [[24.495, 54.588], [24.492, 54.616], [24.47, 54.626], [24.448, 54.614], [24.443, 54.594], [24.459, 54.579], [24.481, 54.577]],
  },
  {
    id: "saadiyat",
    name: "Saadiyat Cultural District",
    color: C.emerald,
    ring: [[24.562, 54.398], [24.568, 54.432], [24.55, 54.462], [24.53, 54.455], [24.522, 54.424], [24.528, 54.399], [24.545, 54.386]],
  },
  {
    id: "maryah",
    name: "Al Maryah Island",
    color: C.emerald,
    ring: [[24.505, 54.386], [24.503, 54.395], [24.496, 54.396], [24.492, 54.389], [24.498, 54.382]],
  },
  {
    id: "reem",
    name: "Al Reem Island",
    color: C.amethyst,
    ring: [[24.509, 54.399], [24.507, 54.413], [24.495, 54.419], [24.484, 54.412], [24.487, 54.401], [24.498, 54.395]],
  },
];

/* Great-circle distance in meters. Kept as a local helper rather than
calling map.distance(): MapView compares a stored centre against the live one
to decide whether to offer "Search this area", and that comparison should not
depend on the map instance still being mounted. */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* Listings database - ticketed events + always-on venues */
/* Demo calendar.

Every date below is generated relative to the day the app loads rather than
hardcoded. A prototype is opened weeks or months after it is built, and a feed
of events that have already happened reads as abandoned. Offsets are in days:
positive is upcoming, negative is history (past payouts, tips and completed
bookings, which should stay in the past).

Dates are display-only — nothing sorts or filters on them — so these are
formatted strings rather than Date objects. */
const DAY_MS = 86400000;
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function offsetDate(days) {
  return new Date(Date.now() + days * DAY_MS);
}

/* "Fri, 4 Sep 2026" */
function eventDate(days) {
  const d = offsetDate(days);
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/* "Fri, 24 Jul" - weekday and date without the year, for compact lists where
   the year would be noise. The weekday is derived rather than written by hand,
   so it always matches the date it sits next to. */
function dayLabel(days) {
  const d = offsetDate(days);
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/* The next occurrence of a given weekday, as a "Fri, 4 Sep" label. Some
   listings are tied to a night rather than a date — a Friday concert, a
   "Thu - Sat Nights" venue — so a fixed day offset would eventually print a
   Tuesday and contradict the copy beside it. 0 = Sunday, 5 = Friday.
   `weeksAhead` pushes past the nearest one. */
function nextWeekdayLabel(weekday, weeksAhead = 0) {
  const today = offsetDate(0);
  const delta = ((weekday - today.getDay() + 7) % 7) || 7;
  return dayLabel(delta + weeksAhead * 7);
}

/* Same offset as a timestamp, for the few places that compare a date against
   "now" rather than printing it. */
function offsetTime(days) {
  return Date.now() + days * DAY_MS;
}

/* "4 Sep 2026" */
function shortDate(days) {
  const d = offsetDate(days);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

const ALL_EVENTS = [
  {
    id: "yas-neon",
    type: "event",
    category: "concerts",
    zone: "Yas Island",
    title: "Neon Pulse Festival",
    venue: "Etihad Park, Yas Island",
    date: eventDate(5),
    time: "20:00 - 02:00",
    price: 295,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 295, perks: "GA festival floor digital pass", left: 1240 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 495, perks: "Front-stage zone express entry lane", left: 180 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 850, perks: "Free lounge access artist meet & greet", left: 12 }
    ],
    permit: "DCT-AD-2026-88410",
    authority: "DCT Abu Dhabi",
    tag: "Headline Concert",
    accent: C.emerald,
    capacity: "38,000 attending",
    talent: "24 Vetted Staff On-Site",
    desc: "Four stages, twelve international acts and Etihad Park's full LED canopy running all night. Gates open 19:00, last entry 23:30.",
    img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4646,
    lng: 54.6019,
  },
  {
    id: "yas-marina",
    type: "event",
    category: "concerts",
    zone: "Yas Island",
    title: "Full Throttle Afterparty",
    venue: "Yas Marina, Trackside Deck",
    date: eventDate(8),
    time: "22:00 - 04:00",
    price: 260,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 260, perks: "Marina deck GA digital pass", left: 420 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 440, perks: "Trackside terrace fast-lane entry", left: 64 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 780, perks: "Paddock VIP lounge dedicated host", left: 8 }
    ],
    permit: "DCT-AD-2026-88422",
    authority: "DCT Abu Dhabi",
    tag: "Marina DJ Set",
    accent: C.amethyst,
    capacity: "2,400 attending",
    talent: "10 Vetted Staff On-Site",
    desc: "Back-to-back techno on the marina decks until sunrise breaks over the F1 circuit. Strict 21+ door policy.",
    img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4593,
    lng: 54.6067,
  },
  {
    id: "saadiyat-symphony",
    type: "event",
    category: "concerts",
    zone: "Saadiyat Cultural District",
    title: "Symphony Under the Stars",
    venue: "Saadiyat Open-Air Amphitheatre",
    date: eventDate(8),
    time: "19:30 - 22:30",
    price: 240,
    pricingType: "seat-selection",
    ticketOptions: [
      { id: "balcony", name: "Balcony", subtitle: "Upper Tier", price: 240, perks: "Full orchestra view open air", left: 310 },
      { id: "mezzanine", name: "Mezzanine", subtitle: "Mid Tier", price: 380, perks: "Centre acoustic sweet spot", left: 88 },
      { id: "royalbox", name: "Royal Box", subtitle: "Floor Seats", price: 920, perks: "Floor seats welcome majlis service", left: 6 }
    ],
    permit: "DCT-AD-2026-77265",
    authority: "DCT Abu Dhabi",
    tag: "Orchestral Night",
    accent: C.amethyst,
    capacity: "4,200 attending",
    talent: "12 Verified Hosts",
    desc: "A 68-piece orchestra performing beside the Louvre Abu Dhabi dome, open-air on the Saadiyat shoreline. Doors 18:30, smart-casual dress.",
    img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    lat: 24.5337,
    lng: 54.3985,
  },
  {
    id: "saadiyat-sundown",
    type: "event",
    category: "concerts",
    zone: "Saadiyat Cultural District",
    title: "Sundown Acoustic Sessions",
    venue: "Saadiyat Beach Club Lawn",
    date: eventDate(10),
    time: "17:30 - 21:00",
    price: 150,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 150, perks: "Lawn blanket spot digital pass", left: 240 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 250, perks: "Front lawn cushion service", left: 40 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 420, perks: "Beach cabana for two free lounge access", left: 5 }
    ],
    permit: "DCT-AD-2026-77291",
    authority: "DCT Abu Dhabi",
    tag: "Beach Live",
    accent: C.emerald,
    capacity: "900 attending",
    talent: "4 Verified Hosts",
    desc: "Barefoot acoustic sets on the beach lawn as the sun drops behind the dunes. Blankets provided, bring nothing.",
    img: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80",
    lat: 24.5547,
    lng: 54.4266,
  },
  {
    id: "maryah-skyline",
    type: "event",
    category: "concerts",
    zone: "Al Maryah Island",
    title: "Skyline Sessions: Deep House",
    venue: "The Galleria Rooftop, Al Maryah",
    date: eventDate(3),
    time: "17:00 - 01:00",
    price: 180,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 180, perks: "Rooftop GA digital pass", left: 300 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 320, perks: "Skyline-rail booth express lift", left: 36 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 560, perks: "Private cabana dedicated host", left: 4 }
    ],
    permit: "DCT-AD-2026-91038",
    authority: "DCT Abu Dhabi",
    tag: "Rooftop Set",
    accent: C.emerald,
    capacity: "1,800 attending",
    talent: "8 Vetted Staff On-Site",
    desc: "Sunset-to-late deep house on The Galleria rooftop with 360° views over the Corniche and the financial district. 21+ entry.",
    img: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
    lat: 24.5008,
    lng: 54.3894,
  },
  {
    id: "reem-indie",
    type: "event",
    category: "concerts",
    zone: "Al Reem Island",
    title: "Reem Nights: Indie Live",
    venue: "Reem Central Park Stage",
    date: eventDate(5),
    time: "18:00 - 23:00",
    price: 165,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 165, perks: "Park GA digital pass", left: 700 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 280, perks: "Stage-front pit express entry", left: 120 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 480, perks: "Backstage porch pass band meet", left: 10 }
    ],
    permit: "DCT-AD-2026-90514",
    authority: "DCT Abu Dhabi",
    tag: "Indie Showcase",
    accent: C.amethyst,
    capacity: "3,100 attending",
    talent: "9 Verified Hosts",
    desc: "Five regional indie bands on the waterfront park stage, food trucks rolling in from 17:00.",
    img: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4934,
    lng: 54.4079,
  },
  {
    id: "corniche-beats",
    type: "event",
    category: "concerts",
    zone: "Corniche",
    title: "Corniche Beats Open-Air",
    venue: "Corniche Beach, Gate 2",
    date: eventDate(20),
    time: "18:30 - 00:00",
    price: 195,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 195, perks: "Beach GA digital pass", left: 2600 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 330, perks: "Golden circle express gates", left: 380 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 590, perks: "Dune deck VIP free lounge access", left: 22 }
    ],
    permit: "DCT-AD-2026-84102",
    authority: "DCT Abu Dhabi",
    tag: "Beachfront Festival",
    accent: C.emerald,
    capacity: "12,000 attending",
    talent: "18 Vetted Staff On-Site",
    desc: "A kilometre of beachfront stages along the Corniche, closing with a 400-drone light show at 22:00.",
    img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4741,
    lng: 54.3369,
  },
  {
    id: "khalifa-bass",
    type: "event",
    category: "concerts",
    zone: "Khalifa City",
    title: "Desert Bass Warehouse",
    venue: "KC Industrial Hangar 7",
    date: eventDate(23),
    time: "21:00 - 03:00",
    price: 210,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 210, perks: "Hangar GA digital pass", left: 1400 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 350, perks: "Bass-pit front zone express entry", left: 210 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 620, perks: "Mezz catwalk VIP free lounge access", left: 14 }
    ],
    permit: "DCT-AD-2026-86630",
    authority: "DCT Abu Dhabi",
    tag: "Warehouse Rave",
    accent: C.amethyst,
    capacity: "5,500 attending",
    talent: "15 Vetted Staff On-Site",
    desc: "Raw hangar acoustics, four bass stages and a 360° laser rig on the desert edge of the city.",
    img: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4203,
    lng: 54.5769,
  },
  {
    id: "zayed-anthems",
    type: "event",
    category: "concerts",
    zone: "Zayed Sports City",
    title: "Stadium Anthems Live",
    venue: "Zayed Sports City Stadium",
    date: eventDate(25),
    time: "19:00 - 23:30",
    price: 320,
    pricingType: "seat-selection",
    ticketOptions: [
      { id: "balcony", name: "Balcony", subtitle: "Upper Tier", price: 320, perks: "Upper bowl full stage view", left: 3200 },
      { id: "mezzanine", name: "Mezzanine", subtitle: "Mid Tier", price: 520, perks: "Mid bowl centre padded seats", left: 640 },
      { id: "royalbox", name: "Royal Box", subtitle: "Floor Seats", price: 1200, perks: "Floor seats free lounge access", left: 18 }
    ],
    permit: "DCT-AD-2026-80071",
    authority: "DCT Abu Dhabi",
    tag: "Stadium Show",
    accent: C.emerald,
    capacity: "43,000 attending",
    talent: "30 Vetted Staff On-Site",
    desc: "A full stadium production: pyro walls, a 200-drone display and three chart headliners on one night.",
    img: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4162,
    lng: 54.453,
  },
  {
    id: "mangrove-lantern",
    type: "event",
    category: "concerts",
    zone: "Eastern Mangroves",
    title: "Mangrove Lantern Concert",
    venue: "Eastern Mangroves Promenade",
    date: eventDate(27),
    time: "18:00 - 21:30",
    price: 120,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 120, perks: "Boardwalk standing digital pass", left: 180 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 200, perks: "Deck seating lantern kit", left: 60 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 340, perks: "Private pontoon for two", left: 4 }
    ],
    permit: "DCT-AD-2026-83319",
    authority: "DCT Abu Dhabi",
    tag: "Chill Acoustic",
    accent: C.amethyst,
    capacity: "750 attending",
    talent: "3 Verified Hosts",
    desc: "A lantern-lit acoustic evening over the mangrove boardwalk - arrive by kayak or on foot.",
    img: "https://images.unsplash.com/photo-1506157786151-68491531f063?auto=format&fit=crop&w=1200&q=80",
    lat: 24.459,
    lng: 54.4417,
  },
  {
    id: "sport-proleague",
    type: "event",
    category: "sports",
    zone: "Al Nahyan",
    title: "UAE Pro League: Al Jazira vs Al Wahda",
    venue: "Mohammed bin Zayed Stadium",
    date: eventDate(42),
    time: "20:45 - 22:45",
    price: 95,
    pricingType: "seat-selection",
    ticketOptions: [
      { id: "balcony", name: "Balcony", subtitle: "Upper Tier", price: 95, perks: "Behind-goal upper bowl", left: 5400 },
      { id: "mezzanine", name: "Mezzanine", subtitle: "Mid Tier", price: 180, perks: "Halfway-line mid bowl", left: 900 },
      { id: "royalbox", name: "Royal Box", subtitle: "Floor Seats", price: 450, perks: "Padded pitchside free lounge access", left: 24 }
    ],
    permit: "DCT-AD-2026-92140",
    authority: "DCT Abu Dhabi",
    tag: "UAE Pro League",
    accent: C.emerald,
    capacity: "37,000 attending",
    talent: "22 Vetted Staff On-Site",
    desc: "Capital derby under the lights - two title rivals, one packed MBZ Stadium. Family stand available.",
    img: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4322,
    lng: 54.4548,
  },
  {
    id: "sport-tennis",
    type: "event",
    category: "sports",
    zone: "Zayed Sports City",
    title: "Mubadala Open: Finals Night",
    venue: "International Tennis Centre",
    date: eventDate(45),
    time: "18:00 - 22:00",
    price: 220,
    pricingType: "seat-selection",
    ticketOptions: [
      { id: "balcony", name: "Balcony", subtitle: "Upper Tier", price: 220, perks: "Upper stand full court view", left: 1400 },
      { id: "mezzanine", name: "Mezzanine", subtitle: "Mid Tier", price: 380, perks: "Baseline mid stand padded seats", left: 260 },
      { id: "royalbox", name: "Royal Box", subtitle: "Floor Seats", price: 950, perks: "Courtside free lounge access", left: 8 }
    ],
    permit: "DCT-AD-2026-92177",
    authority: "DCT Abu Dhabi",
    tag: "Championship Tennis",
    accent: C.amethyst,
    capacity: "5,000 attending",
    talent: "9 Verified Hosts",
    desc: "Championship point under the desert night sky - the finals of the region's marquee hard-court draw.",
    img: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4189,
    lng: 54.4489,
  },
  {
    id: "esport-valorant",
    type: "event",
    category: "esports",
    zone: "Yas Island",
    title: "Yas Gaming Grounds: Valorant Clash",
    venue: "Etihad Arena, Yas Bay",
    date: eventDate(57),
    time: "16:00 - 23:00",
    price: 145,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 145, perks: "Arena bowl GA digital pass", left: 2400 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 260, perks: "Lower-bowl reserved team-store voucher", left: 340 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 520, perks: "Player-lounge access signed jersey", left: 16 }
    ],
    permit: "DCT-AD-2026-93310",
    authority: "DCT Abu Dhabi",
    tag: "E-Sports Major",
    accent: C.amethyst,
    capacity: "11,000 attending",
    talent: "14 Vetted Staff On-Site",
    desc: "Eight regional rosters, one LAN stage - quarterfinals to grand final with full broadcast production.",
    img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4527,
    lng: 54.6036,
  },
  {
    id: "esport-simracing",
    type: "event",
    category: "esports",
    zone: "ADNEC",
    title: "Desert Circuit: Sim-Racing Final",
    venue: "ADNEC Hall 5",
    date: eventDate(59),
    time: "17:00 - 22:00",
    price: 110,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 110, perks: "Hall GA digital pass", left: 900 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 190, perks: "Grandstand reserved seat", left: 150 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 380, perks: "Pit-lane VIP rig hot-lap session", left: 10 }
    ],
    permit: "DCT-AD-2026-93342",
    authority: "DCT Abu Dhabi",
    tag: "Sim Racing",
    accent: C.emerald,
    capacity: "3,500 attending",
    talent: "6 Verified Hosts",
    desc: "Thirty full-motion rigs, one virtual Yas Marina Circuit - the region's fastest sim drivers go flat out.",
    img: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4187,
    lng: 54.4344,
  },
  {
    id: "theater-mirage",
    type: "event",
    category: "theaters",
    zone: "Downtown Dubai",
    title: "Mirage: An Arabian Musical",
    venue: "Dubai Opera",
    date: eventDate(71),
    time: "19:30 - 22:15",
    price: 350,
    pricingType: "seat-selection",
    ticketOptions: [
      { id: "balcony", name: "Balcony", subtitle: "Upper Tier", price: 350, perks: "Grand-tier view of the full set", left: 260 },
      { id: "mezzanine", name: "Mezzanine", subtitle: "Mid Tier", price: 620, perks: "Centre mezzanine acoustics", left: 84 },
      { id: "royalbox", name: "Royal Box", subtitle: "Floor Seats", price: 1500, perks: "Royal Box interval majlis service", left: 4 }
    ],
    permit: "DET-DXB-2026-55801",
    authority: "Dubai Economy & Tourism",
    tag: "Musical Theater",
    accent: C.amethyst,
    capacity: "1,900 attending",
    talent: "18 Vetted Staff On-Site",
    desc: "A sweeping original musical - 40-strong cast, flying set pieces and a live 22-piece orchestra at Dubai Opera.",
    img: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80",
    lat: 25.193,
    lng: 55.273,
  },
  {
    id: "theater-qasr",
    type: "event",
    category: "theaters",
    zone: "Al Hosn",
    title: "Qasr Stories: A Heritage Musical",
    venue: "Cultural Foundation Theater",
    date: eventDate(74),
    time: "20:00 - 22:00",
    price: 175,
    pricingType: "seat-selection",
    ticketOptions: [
      { id: "balcony", name: "Balcony", subtitle: "Upper Tier", price: 175, perks: "Upper balcony full stage view", left: 190 },
      { id: "mezzanine", name: "Mezzanine", subtitle: "Mid Tier", price: 290, perks: "Centre mezzanine rows", left: 70 },
      { id: "royalbox", name: "Royal Box", subtitle: "Floor Seats", price: 640, perks: "Front floor cast meet after show", left: 6 }
    ],
    permit: "DCT-AD-2026-94015",
    authority: "DCT Abu Dhabi",
    tag: "Musical Theater",
    accent: C.emerald,
    capacity: "900 attending",
    talent: "11 Verified Hosts",
    desc: "Three generations of one Al Hosn family, told through song beside the fort where the city began.",
    img: "https://images.unsplash.com/photo-1507924538820-ede94a04019d?auto=format&fit=crop&w=1200&q=80",
    lat: 24.482,
    lng: 54.3542,
  },
  {
    id: "tour-mangrove-kayak",
    type: "event",
    category: "tourist",
    zone: "Jubail Island",
    title: "Jubail Night Kayak & Glow Tour",
    venue: "Jubail Mangrove Park",
    date: eventDate(8),
    time: "18:30 - 21:00",
    price: 130,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 130, perks: "Single kayak licensed guide", left: 34 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 210, perks: "Tandem kayak photo pack", left: 12 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 360, perks: "Private guide sunset majlis picnic", left: 3 }
    ],
    permit: "DCT-AD-2026-95120",
    authority: "DCT Abu Dhabi",
    tag: "Nature Getaway",
    accent: C.emerald,
    capacity: "60 attending",
    talent: "5 Verified Hosts",
    desc: "Paddle the bioluminescent channels after dark with licensed eco-guides - beginners welcome, gear included.",
    img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    lat: 24.545,
    lng: 54.487,
  },
  {
    id: "tour-qasr-lights",
    type: "event",
    category: "tourist",
    zone: "Al Ras Al Akhdar",
    title: "Qasr Al Watan: Palace Lights Tour",
    venue: "Qasr Al Watan",
    date: eventDate(3),
    time: "19:00 - 21:00",
    price: 65,
    pricingType: "tiered",
    ticketOptions: [
      { id: "silver", name: "Silver", subtitle: "Standard", price: 65, perks: "Guided evening walk digital pass", left: 240 },
      { id: "gold", name: "Gold", subtitle: "Premium", price: 110, perks: "Walk palace library access", left: 60 },
      { id: "platinum", name: "Platinum", subtitle: "VIP", price: 220, perks: "Private curator tour free lounge access", left: 6 }
    ],
    permit: "DCT-AD-2026-95166",
    authority: "DCT Abu Dhabi",
    tag: "Cultural Site",
    accent: C.amethyst,
    capacity: "400 attending",
    talent: "7 Vetted Staff On-Site",
    desc: "The presidential palace after dark - the Light & Glory projection show plus a guided great-hall walk.",
    img: "https://images.unsplash.com/photo-1466442929976-97f336a657be?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4614,
    lng: 54.3055,
  },
  {
    id: "venue-maryah-lounge",
    type: "venue",
    category: "nightlife",
    zone: "Al Maryah Island",
    title: "Amethyst Sky Lounge",
    venue: "Level 32, Al Maryah Tower",
    hours: "17:00 - 03:00",
    days: "Daily",
    rating: "4.8",
    reviews: 620,
    pinLabel: "4.8",
    tier: "Avg: AED 240",
    licence: "TL-2026-40217",
    tag: "Rooftop Lounge",
    accent: C.amethyst,
    talent: "6 Licensed Staff",
    desc: "Signature cocktails 32 floors above the Galleria, with the whole Maryah skyline wrapped around the terrace.",
    img: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4996,
    lng: 54.3922,
  },
  {
    id: "venue-saadiyat-beachclub",
    type: "venue",
    category: "nightlife",
    zone: "Saadiyat Cultural District",
    title: "Solace Beach Club",
    venue: "Saadiyat Beach, North Gate",
    hours: "10:00 - 00:00",
    days: "Daily",
    rating: "4.6",
    reviews: 1400,
    pinLabel: "4.6",
    tier: "Entry: Free",
    licence: "TL-2026-38854",
    tag: "Beach Club",
    accent: C.emerald,
    talent: "12 Licensed Staff",
    desc: "White-sand daybeds by day, shoreline DJ sets after dark - free entry, minimum spend applies on weekends.",
    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    lat: 24.5498,
    lng: 54.4148,
  },
  {
    id: "venue-corniche-grill",
    type: "venue",
    category: "dining",
    zone: "Corniche",
    title: "Dhow & Ember",
    venue: "Corniche Breakwater Promenade",
    hours: "12:00 - 23:30",
    days: "Daily",
    rating: "4.7",
    reviews: 980,
    pinLabel: "4.7",
    tier: "Avg: AED 180",
    licence: "TL-2026-35102",
    tag: "Charcoal Grill",
    accent: C.emerald,
    talent: "9 Licensed Staff",
    desc: "Modern Emirati charcoal grill on the breakwater - whole hammour, camel-milk desserts and open Gulf views.",
    img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4712,
    lng: 54.3255,
  },
  {
    id: "venue-yas-trattoria",
    type: "venue",
    category: "dining",
    zone: "Yas Island",
    title: "Marina Fuoco",
    venue: "Yas Marina Boardwalk, Berth 9",
    hours: "13:00 - 00:00",
    days: "Daily",
    rating: "4.5",
    reviews: 730,
    pinLabel: "4.5",
    tier: "Avg: AED 160",
    licence: "TL-2026-41669",
    tag: "Waterfront Trattoria",
    accent: C.amethyst,
    talent: "7 Licensed Staff",
    desc: "Wood-fired Neapolitan plates on the Yas Marina boardwalk, superyachts idling a table away.",
    img: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4601,
    lng: 54.6035,
  },
  {
    id: "venue-reem-cafe",
    type: "venue",
    category: "cafes",
    zone: "Al Reem Island",
    title: "Kõpi Roastery",
    venue: "Reem Central Park, Podium Level",
    hours: "07:00 - 22:00",
    days: "Daily",
    rating: "4.9",
    reviews: 460,
    pinLabel: "4.9",
    tier: "Avg: AED 45",
    licence: "TL-2026-33018",
    tag: "Specialty Coffee",
    accent: C.emerald,
    talent: "4 Licensed Staff",
    desc: "Single-origin roasts and slow-bar brews facing Reem Central Park - laptops welcome till close.",
    img: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4949,
    lng: 54.4056,
  },
  {
    id: "comedy-showdown",
    type: "event",
    category: "comedy",
    zone: "Al Maryah Island",
    title: "Stand-Up Showdown: Gulf Comedy Nights",
    venue: "The Attic Comedy Club, Al Maryah Island",
    date: eventDate(108),
    time: "20:30 - 23:00",
    price: 120,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 120, perks: "Full event access", left: 210 }],
    permit: "DCT-AD-2026-71203",
    authority: "DCT Abu Dhabi",
    tag: "Comedy Night",
    accent: C.emerald,
    capacity: "220 seated",
    talent: "6 Vetted Staff On-Site",
    desc: "Six stand-up comedians share one stage for a night of English-language sets, from crowd work to storytelling. Doors 19:45, 18+ only.",
    img: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4989,
    lng: 54.3839,
    organizer: "Oryx Live Entertainment",
  },
  {
    id: "comedy-desert-laughs",
    type: "event",
    category: "comedy",
    zone: "Hudayriyat Island",
    title: "Desert Laughs Comedy Festival",
    venue: "Hudayriyat Island Amphitheatre",
    date: eventDate(145),
    time: "19:00 - 22:30",
    price: 175,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 175, perks: "Full event access", left: 480 }],
    permit: "DCT-AD-2026-71340",
    authority: "DCT Abu Dhabi",
    tag: "Comedy Festival",
    accent: C.emerald,
    capacity: "1,800 attending",
    talent: "14 Vetted Staff On-Site",
    desc: "An open-air comedy festival on Hudayriyat's waterfront amphitheatre, headlined by touring international acts alongside regional up-and-comers.",
    img: "https://images.unsplash.com/photo-1611956425642-d5a8169abd63?auto=format&fit=crop&w=1200&q=80",
    lat: 24.462,
    lng: 54.435,
    organizer: "Oryx Live Entertainment",
  },
  {
    id: "arts-manarat-visions",
    type: "event",
    category: "arts",
    zone: "Saadiyat Cultural District",
    title: "Manarat Al Saadiyat: Contemporary Visions",
    venue: "Manarat Al Saadiyat",
    date: eventDate(123),
    time: "18:00 - 21:00",
    price: 0,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 0, perks: "Full event access", left: 350 }],
    permit: "DCT-AD-2026-71412",
    authority: "DCT Abu Dhabi",
    tag: "Art Exhibition",
    accent: C.emerald,
    capacity: "Free entry",
    talent: "8 Vetted Staff On-Site",
    desc: "A group exhibition of emerging Gulf-region contemporary artists, spanning painting, sculpture and video installation. Opening night includes an artist walkthrough at 19:00.",
    img: "https://images.unsplash.com/photo-1606819717115-9159c900370b?auto=format&fit=crop&w=1200&q=80",
    lat: 24.546,
    lng: 54.435,
    organizer: "Saffron Arts Collective",
  },
  {
    id: "arts-warehouse-voices",
    type: "event",
    category: "arts",
    zone: "Al Mina",
    title: "Saffron Collective: Emerging Voices Exhibition",
    venue: "Warehouse421, Al Mina",
    date: eventDate(159),
    time: "17:00 - 22:00",
    price: 45,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 45, perks: "Full event access", left: 260 }],
    permit: "DCT-AD-2026-71455",
    authority: "DCT Abu Dhabi",
    tag: "Art Exhibition",
    accent: C.emerald,
    capacity: "300 attending",
    talent: "7 Vetted Staff On-Site",
    desc: "First solo showcases from six early-career UAE-based artists, curated inside Warehouse421's industrial gallery space on the waterfront.",
    img: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80",
    lat: 24.507,
    lng: 54.372,
    organizer: "Saffron Arts Collective",
  },
  {
    id: "business-founders-summit",
    type: "event",
    category: "business",
    zone: "Al Maryah Island",
    title: "Gulf Founders Summit",
    venue: "ADGM Square, Al Maryah Island",
    date: eventDate(118),
    time: "09:00 - 17:00",
    price: 650,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 650, perks: "Full event access", left: 140 }],
    permit: "DCT-AD-2026-71501",
    authority: "DCT Abu Dhabi",
    tag: "Business Summit",
    accent: C.emerald,
    capacity: "500 attending",
    talent: "12 Vetted Staff On-Site",
    desc: "A full-day summit for early and growth-stage founders across the Gulf, with panels on fundraising, ADGM company structuring, and scaling into Saudi and Egypt.",
    img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4989,
    lng: 54.3839,
    organizer: "Meridian Business Circle",
  },
  {
    id: "business-women-tech",
    type: "event",
    category: "business",
    zone: "Downtown Dubai",
    title: "Women in Tech: MENA Leadership Forum",
    venue: "DIFC Gate Village, Dubai",
    date: eventDate(137),
    time: "10:00 - 16:00",
    price: 380,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 380, perks: "Full event access", left: 190 }],
    permit: "DED-DXB-2026-33012",
    authority: "Dubai DED",
    tag: "Business Forum",
    accent: C.emerald,
    capacity: "400 attending",
    talent: "10 Vetted Staff On-Site",
    desc: "A leadership forum for women building and leading technology companies across the MENA region, with mentorship tables and a closing networking reception.",
    img: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=80",
    lat: 25.212,
    lng: 55.282,
    organizer: "Meridian Business Circle",
  },
  {
    id: "fashion-ad-runway-gala",
    type: "event",
    category: "fashion",
    zone: "Al Maryah Island",
    title: "Abu Dhabi Fashion Week: Runway Gala",
    venue: "The Galleria, Al Maryah Island",
    date: eventDate(128),
    time: "19:00 - 23:00",
    price: 420,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 420, perks: "Full event access", left: 165 }],
    permit: "DCT-AD-2026-71602",
    authority: "DCT Abu Dhabi",
    tag: "Fashion Show",
    accent: C.emerald,
    capacity: "600 attending",
    talent: "16 Vetted Staff On-Site",
    desc: "Six regional designers close out fashion week with a runway gala on The Galleria's waterfront promenade, followed by a champagne reception.",
    img: "https://images.unsplash.com/photo-1543728069-a3f97c5a2f32?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4989,
    lng: 54.3839,
    organizer: "Saffron Arts Collective",
  },
  {
    id: "fashion-d3-popup",
    type: "event",
    category: "fashion",
    zone: "Downtown Dubai",
    title: "Dubai Design District Pop-Up Showcase",
    venue: "d3 (Dubai Design District)",
    date: eventDate(164),
    time: "16:00 - 21:00",
    price: 60,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 60, perks: "Full event access", left: 320 }],
    permit: "DED-DXB-2026-33089",
    authority: "Dubai DED",
    tag: "Fashion Showcase",
    accent: C.emerald,
    capacity: "450 attending",
    talent: "9 Vetted Staff On-Site",
    desc: "Independent regional labels take over d3's courtyard with pop-up racks, a rotating micro-runway, and DJ sets running through the evening.",
    img: "https://images.unsplash.com/photo-1733322992706-1210ca79f4df?auto=format&fit=crop&w=1200&q=80",
    lat: 25.188,
    lng: 55.313,
    organizer: "Saffron Arts Collective",
  },
  {
    id: "wellness-sunrise-yoga",
    type: "event",
    category: "wellness",
    zone: "Hudayriyat Island",
    title: "Sunrise Yoga & Sound Bath Retreat",
    venue: "Hudayriyat Island Beach",
    date: eventDate(125),
    time: "06:00 - 08:30",
    price: 95,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 95, perks: "Full event access", left: 90 }],
    permit: "DCT-AD-2026-71710",
    authority: "DCT Abu Dhabi",
    tag: "Wellness Retreat",
    accent: C.emerald,
    capacity: "120 attending",
    talent: "5 Vetted Staff On-Site",
    desc: "A beachfront morning of guided vinyasa flow followed by a crystal-bowl sound bath, mats and light breakfast included.",
    img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
    lat: 24.462,
    lng: 54.435,
    organizer: "Meridian Business Circle",
  },
  {
    id: "wellness-corniche-festival",
    type: "event",
    category: "wellness",
    zone: "Corniche",
    title: "Corniche Wellness Festival",
    venue: "Corniche Beach, Gate 5",
    date: eventDate(162),
    time: "08:00 - 13:00",
    price: 0,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 0, perks: "Full event access", left: 600 }],
    permit: "DCT-AD-2026-71755",
    authority: "DCT Abu Dhabi",
    tag: "Wellness Festival",
    accent: C.emerald,
    capacity: "Free entry",
    talent: "18 Vetted Staff On-Site",
    desc: "A free morning festival along the Corniche with back-to-back yoga, pilates and breathwork sessions, plus a market of local wellness and nutrition vendors.",
    img: "https://images.unsplash.com/photo-1687180948630-2780c8b3f7f6?auto=format&fit=crop&w=1200&q=80",
    lat: 24.475,
    lng: 54.331,
    organizer: "Meridian Business Circle",
  },
  {
    id: "family-yas-fun-day",
    type: "event",
    category: "family",
    zone: "Yas Island",
    title: "Yas Island Family Fun Day",
    venue: "Yas Bay Waterfront",
    date: eventDate(142),
    time: "10:00 - 18:00",
    price: 55,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 55, perks: "Full event access", left: 700 }],
    permit: "DCT-AD-2026-71820",
    authority: "DCT Abu Dhabi",
    tag: "Family Event",
    accent: C.emerald,
    capacity: "1,500 attending",
    talent: "20 Vetted Staff On-Site",
    desc: "Waterfront games, face painting, a kids' obstacle course and live entertainment along Yas Bay, with entry free for children under 3.",
    img: "https://images.unsplash.com/photo-1766353846985-297b6526171b?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4646,
    lng: 54.6019,
    organizer: "Meridian Business Circle",
  },
  {
    id: "family-kids-carnival",
    type: "event",
    category: "family",
    zone: "Al Maryah Island",
    title: "Kids' Discovery Carnival",
    venue: "Umm Al Emarat Park",
    date: eventDate(179),
    time: "09:00 - 17:00",
    price: 35,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 35, perks: "Full event access", left: 550 }],
    permit: "DCT-AD-2026-71866",
    authority: "DCT Abu Dhabi",
    tag: "Family Carnival",
    accent: C.emerald,
    capacity: "1,200 attending",
    talent: "22 Vetted Staff On-Site",
    desc: "A park-wide carnival with science stations, a petting zoo, puppet shows and carnival games spread across Umm Al Emarat Park's shaded lawns.",
    img: "https://images.unsplash.com/photo-1575045663365-6d561e059e60?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4426,
    lng: 54.3859,
    organizer: "Meridian Business Circle",
  },
  {
    id: "workshop-emirati-coffee",
    type: "event",
    category: "workshops",
    zone: "Al Hosn",
    title: "Emirati Coffee & Culture Workshop",
    venue: "Qasr Al Hosn Cultural Site",
    date: eventDate(113),
    time: "17:00 - 19:00",
    price: 85,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 85, perks: "Full event access", left: 40 }],
    permit: "DCT-AD-2026-71910",
    authority: "DCT Abu Dhabi",
    tag: "Cultural Workshop",
    accent: C.emerald,
    capacity: "45 attending",
    talent: "4 Vetted Staff On-Site",
    desc: "A hands-on session on traditional Emirati qahwa preparation and hospitality customs, hosted inside Qasr Al Hosn's historic walls.",
    img: "https://images.unsplash.com/photo-1569783721854-33a99b4c0bae?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4764,
    lng: 54.3705,
    organizer: "Saffron Arts Collective",
  },
  {
    id: "workshop-pottery-ceramics",
    type: "event",
    category: "workshops",
    zone: "Al Mina",
    title: "Pottery & Ceramics Masterclass",
    venue: "Warehouse421, Al Mina",
    date: eventDate(147),
    time: "14:00 - 17:00",
    price: 150,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 150, perks: "Full event access", left: 24 }],
    permit: "DCT-AD-2026-71944",
    authority: "DCT Abu Dhabi",
    tag: "Craft Workshop",
    accent: C.emerald,
    capacity: "26 attending",
    talent: "3 Vetted Staff On-Site",
    desc: "A small-group wheel-throwing and glazing class for all skill levels, materials included, finished pieces ready for pickup two weeks later.",
    img: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=1200&q=80",
    lat: 24.507,
    lng: 54.372,
    organizer: "Saffron Arts Collective",
  },
  {
    id: "nightlife-oryx-rooftop",
    type: "event",
    category: "nightlife",
    zone: "Al Bateen",
    title: "Oryx Rooftop Sessions: Deep House Edition",
    venue: "Al Bateen Marina Rooftop",
    date: eventDate(106),
    time: "21:00 - 01:00",
    price: 140,
    pricingType: "flat",
    ticketOptions: [{ id: "standard", name: "Standard", subtitle: "General Admission", price: 140, perks: "Full event access", left: 130 }],
    permit: "DCT-AD-2026-72010",
    authority: "DCT Abu Dhabi",
    tag: "Nightlife",
    accent: C.emerald,
    capacity: "280 attending",
    talent: "9 Vetted Staff On-Site",
    desc: "A rooftop deep-house night overlooking Al Bateen Marina, resident and guest DJs back to back until close.",
    img: "https://images.unsplash.com/photo-1580188928585-0ef5c1a5c4dd?auto=format&fit=crop&w=1200&q=80",
    lat: 24.4611,
    lng: 54.3273,
    organizer: "Oryx Live Entertainment",
  },
];

/* Utilities */
const fmtAED = (n) => `AED ${n.toFixed(2)}`;

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const QR_N = 25;

function buildQrMatrix(token) {
  const rand = mulberry32(hashSeed(token));
  const m = Array.from({ length: QR_N }, () => Array(QR_N).fill(false));
  for (let r = 0; r < QR_N; r++) {
    for (let c = 0; c < QR_N; c++) {
      m[r][c] = rand() > 0.5;
    }
  }

  const stampFinder = (top, left) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = top + r;
        const cc = left + c;
        if (rr < 0 || cc < 0 || rr >= QR_N || cc >= QR_N) continue;
        const inSquare = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const ring = inSquare && (r === 0 || r === 6 || c === 0 || c === 6);
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[rr][cc] = ring || core;
      }
    }
  };

  stampFinder(0, 0);
  stampFinder(0, QR_N - 7);
  stampFinder(QR_N - 7, 0);

  for (let i = 8; i < QR_N - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
  }

  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = 18 + r;
      const cc = 18 + c;
      const edge = Math.max(Math.abs(r), Math.abs(c)) === 2;
      m[rr][cc] = edge || (r === 0 && c === 0);
    }
  }
  
  if (QR_N - 8 >= 0 && m[QR_N - 8]) {
    m[QR_N - 8][8] = true;
  }
  
  return m;
}

function genToken() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VP-${part()}-${part()}-${part()}`;
}

function ContactlessIcon({ size = 28, color = "#FFFFFF" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6.2" cy="12" r="1.6" fill={color} />
      <path
        d="M10 8.5c1.9 2.1 1.9 4.9 0 7"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M13.2 6.2c3 3.3 3 8.3 0 11.6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16.4 3.9c4.1 4.6 4.1 11.6 0 16.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* Discovery map — a real slippy map: Leaflet panning/zooming over CARTO's
dark OpenStreetMap raster tiles, replacing the hand-drawn SVG coastline this
component used to render.

That SVG existed for one reason: the original prototype ran inside an artifact
sandbox that blocked both external scripts and tile requests, so the map had to
be faked from ~40 hardcoded polygon vertices. This is a bundled Vite app now —
Leaflet is an ordinary dependency and tiles are an ordinary network request —
so the approximation is no longer necessary and real Abu Dhabi geography is
available instead.

Leaflet owns tiles and gestures. Markers deliberately stay React-rendered in an
absolutely positioned overlay rather than becoming L.marker/divIcon: that keeps
the existing pin markup, styling and click handlers exactly as they were, and
avoids hand-writing HTML strings. The overlay re-projects through
latLngToContainerPoint on every move/zoom.

The imperative handle keeps the shape MapView already calls. `k` stays a linear
scale factor because MapView compares it as a ratio (now.k / last.k > 1.25), so
it is exposed as 2^(zoom - BASE_ZOOM): one zoom level doubles k, which keeps
that existing threshold behaving as it did under d3.zoom. */

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>';

/* Zoom 12 frames the Abu Dhabi metro area. It is also the anchor for the
k <-> zoom conversion below, so changing it rescales every k the handle
reports — keep it and INITIAL_CENTER in step. */
const BASE_ZOOM = 12;
const MIN_ZOOM = 9;
const MAX_ZOOM = 18;

const kToZoom = (k) => BASE_ZOOM + Math.log2(Math.max(k, 0.01));
const zoomToK = (zoom) => Math.pow(2, zoom - BASE_ZOOM);

/* Pins beyond this many pixels outside the viewport are not rendered. Matches
the cull the SVG implementation used. */
const MARKER_CULL_PX = 60;

const DiscoveryMap = forwardRef(function DiscoveryMap(
  {
    visibleEvents,
    onSelect,
    selectedId,
    showSearch,
    searching,
    onSearchArea,
    onViewChange,
  },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const onViewChangeRef = useRef(onViewChange);
  /* `map` drives rendering (it must trigger a re-render once Leaflet is up);
  `mapRef` gives the imperative handle a stable reference that does not churn
  its useCallback dependencies. Both point at the same instance. */
  const [map, setMap] = useState(null);
  /* Bumped on every move/zoom so the marker overlay re-projects. */
  const [viewTick, setViewTick] = useState(0);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  /* A layout effect, not a passive one: MapView calls runSearch() from its own
  mount effect, and React flushes child layout effects before parent passive
  effects, so the handle is live by the time that first search runs. */
  useLayoutEffect(() => {
    if (mapRef.current || !containerRef.current) return undefined;

    const instance = L.map(containerRef.current, {
      center: INITIAL_CENTER,
      zoom: BASE_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomControl: false,
      attributionControl: true,
      /* The chrome overlaying this map (permit badge, result count, "Search
      this area") is our own, so Leaflet's inertia would fight the pins. */
      zoomSnap: 0.25,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: MAX_ZOOM,
      detectRetina: true,
    }).addTo(instance);

    /* DISTRICT_ZONES carries real lat/lng rings, so under a real projection
    they can be drawn as actual polygons rather than the decorative blobs the
    SVG version painted. */
    DISTRICT_ZONES.forEach((zone) => {
      L.polygon(zone.ring, {
        color: zone.color,
        weight: 1.25,
        opacity: 0.85,
        fillColor: zone.color,
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(instance);
    });

    const handleView = () => {
      setViewTick((tick) => tick + 1);
      if (onViewChangeRef.current) onViewChangeRef.current();
    };
    instance.on("move zoom resize", handleView);

    mapRef.current = instance;
    setMap(instance);

    return () => {
      instance.off("move zoom resize", handleView);
      instance.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, []);

  /* Leaflet caches the container size, so it has to be told when the flex
  parent resizes — otherwise tiles clip after an orientation change. */
  useEffect(() => {
    if (!map || !containerRef.current || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [map]);

  const flyToLatLng = useCallback((lat, lng, k, duration = 600) => {
    const instance = mapRef.current;
    if (!instance) return;
    instance.flyTo([lat, lng], kToZoom(k), { duration: duration / 1000 });
  }, []);

  const flyToBounds = useCallback((ring, duration = 600) => {
    const instance = mapRef.current;
    if (!instance || !ring || ring.length === 0) return;
    instance.flyToBounds(L.latLngBounds(ring), {
      duration: duration / 1000,
      padding: [24, 24],
    });
  }, []);

  const getCenterAndScale = useCallback(() => {
    const instance = mapRef.current;
    if (!instance) {
      return { lat: INITIAL_CENTER[0], lng: INITIAL_CENTER[1], k: 1 };
    }
    const center = instance.getCenter();
    return { lat: center.lat, lng: center.lng, k: zoomToK(instance.getZoom()) };
  }, []);

  /* Falls back to the whole world rather than an empty box: if this is ever
  called before Leaflet is up, showing every pin is a better failure than
  showing none. */
  const getVisibleBounds = useCallback(() => {
    const instance = mapRef.current;
    if (!instance) {
      return { latMin: -90, latMax: 90, lngMin: -180, lngMax: 180 };
    }
    const bounds = instance.getBounds();
    return {
      latMin: bounds.getSouth(),
      latMax: bounds.getNorth(),
      lngMin: bounds.getWest(),
      lngMax: bounds.getEast(),
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      flyToLatLng,
      flyToBounds,
      resetHome: (duration = 0) => {
        const instance = mapRef.current;
        if (!instance) return;
        instance.flyTo(INITIAL_CENTER, BASE_ZOOM, { duration: duration / 1000 });
      },
      getCenterAndScale,
      getVisibleBounds,
    }),
    [flyToLatLng, flyToBounds, getCenterAndScale, getVisibleBounds]
  );

  /* viewTick is a dependency rather than a value: it is what re-runs the
  projection after Leaflet moves. */
  const markers = useMemo(() => {
    if (!map) return [];
    return visibleEvents
      .map((ev) => {
        const point = map.latLngToContainerPoint([ev.lat, ev.lng]);
        const size = map.getSize();
        if (
          point.x < -MARKER_CULL_PX ||
          point.x > size.x + MARKER_CULL_PX ||
          point.y < -MARKER_CULL_PX ||
          point.y > size.y + MARKER_CULL_PX
        ) {
          return null;
        }
        return { ev, x: point.x, y: point.y };
      })
      .filter(Boolean);
  }, [map, viewTick, visibleEvents]);

  const searchVisible = showSearch || searching;
  const zoomLabel = map ? map.getZoom().toFixed(2) : "--";
  const zoomedIn = map ? map.getZoom() > BASE_ZOOM + 0.6 : false;

  return (
    <div
      className="relative w-full min-h-0 flex-1 select-none overflow-hidden rounded-3xl border"
      style={{ borderColor: C.line, background: C.bg }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        aria-label="Interactive map of UAE events and venues"
        role="application"
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 500 }}
      >
        {markers.map(({ ev, x, y }) => {
          const isVenue = ev.type === "venue";
          const active = ev.id === selectedId;
          const glowStyle = isVenue
            ? {
                background: ev.accent,
                borderColor: "rgba(255,255,255,0.92)",
                color: "#0A0A0C",
                boxShadow: `0 2px 10px rgba(10,10,12,0.4), 0 0 6px ${ev.accent}99, 0 0 16px ${ev.accent}66, 0 0 28px ${ev.accent}26`,
              }
            : {
                borderColor: ev.accent,
                boxShadow: `0 2px 10px rgba(10,10,12,0.45), 0 0 5px ${ev.accent}88, 0 0 14px ${ev.accent}55, 0 0 24px ${ev.accent}22`,
              };
          const activeStyle = active
            ? {
                background: C.amethyst,
                color: "#0A0A0C",
                borderColor: "rgba(255,255,255,0.95)",
                boxShadow: `0 3px 14px rgba(10,10,12,0.5), 0 0 8px ${C.amethyst}, 0 0 22px ${C.amethyst}99, 0 0 36px ${C.amethyst}44`,
              }
            : {};
          return (
            <button
              key={ev.id}
              onClick={() => {
                const currentK = map ? zoomToK(map.getZoom()) : 1;
                flyToLatLng(ev.lat, ev.lng, Math.max(currentK, 1.8), 600);
                onSelect(ev);
              }}
              className={`vp-price-pin pointer-events-auto${active ? " vp-price-pin-active" : ""}`}
              style={{
                left: x,
                top: y,
                zIndex: active ? 30 : 10,
                ...glowStyle,
                ...activeStyle,
              }}
              aria-label={ev.title}
            >
              {isVenue ? (
                ev.pinLabel
              ) : (
                <>
                  <span
                    className="vp-pin-dot"
                    style={{ background: active ? "#0A0A0C" : ev.accent }}
                  />
                  AED {ev.price}
                </>
              )}
            </button>
          );
        })}
      </div>

      <div
        className="absolute top-3 left-3 flex flex-col gap-1 rounded-2xl px-2.5 py-2"
        style={{
          background: "rgba(10,10,12,0.85)",
          border: `1px solid ${C.line}`,
          zIndex: 1000,
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: C.emerald }}
          />
          <span
            className="font-mono uppercase"
            style={{ color: C.textHi, letterSpacing: 1, fontSize: 9, fontWeight: 700 }}
          >
            DCT Permit Layer: Verified
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: zoomedIn ? C.amethyst : C.emerald }}
          />
          <span
            className="font-mono uppercase"
            style={{ color: C.textMid, letterSpacing: 1, fontSize: 9 }}
          >
            Zoom Level: {zoomLabel}
          </span>
        </div>
      </div>

      <div
        className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs"
        style={{
          background: "rgba(10,10,12,0.8)",
          border: `1px solid ${C.line}`,
          color: C.textMid,
          zIndex: 1000,
        }}
      >
        {visibleEvents.length} in view DCT verified
      </div>

      {/* Rendered unconditionally and hidden with CSS rather than mounted and
      unmounted. Removing this node mid-interaction produced a NotFoundError
      ("the node to be removed is not a child of this node") on Firefox when
      "Search this area" was tapped — React's removal raced something else
      touching the subtree. Keeping the element alive removes that race
      entirely, and an always-mounted button also avoids the layout shift that
      made the ResizeObserver re-measure the map on every appearance. */}
      <button
          onClick={onSearchArea}
          disabled={searching || !searchVisible}
          aria-hidden={!searchVisible}
          className="absolute top-14 flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-transform active:scale-95"
          style={{
            left: "50%",
            zIndex: 1000,
            opacity: searchVisible ? 1 : 0,
            visibility: searchVisible ? "visible" : "hidden",
            pointerEvents: searchVisible ? "auto" : "none",
            transition: "opacity 0.18s ease",
            background: "rgba(10,10,12,0.94)",
            border: `1.5px solid ${C.emerald}`,
            color: C.textHi,
            boxShadow: `0 8px 26px rgba(0,0,0,0.55), 0 0 18px ${C.emerald}44`,
            transform: "translateX(-50%)",
          }}
          aria-label="Search this area"
        >
          {searching ? (
            <>
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span
                  className="absolute h-4 w-4 rounded-full border-2"
                  style={{
                    borderColor: C.emerald,
                    animation: "vpRingPulse 0.8s ease-in-out infinite",
                  }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: C.emerald }}
                />
              </span>
              <span style={{ color: C.emerald }}>Searching...</span>
            </>
          ) : (
            <>
              <RefreshCw size={13} color={C.emerald} />
              Search this area
            </>
          )}
        </button>
    </div>
  );
});

/* Shared header - VibePass wordmark + location + account avatar. Used by
both Feed and Map now that they're separate tabs (previously one combined
Explore screen), matching the spec's "Feed, Map, Tickets, and Profile"
tab list. */
function AppHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">
          <span style={{ color: C.textHi }}>Vibe</span>
          <span
            style={{
              backgroundImage: `linear-gradient(90deg, ${C.emerald}, ${C.amethyst})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Pass
          </span>
        </h1>
        <p
          className="mt-0.5 flex items-center gap-1 text-xs"
          style={{ color: C.textMid }}
        >
          <MapPin size={11} color={C.emerald} /> Abu Dhabi, UAE
        </p>
      </div>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
        style={{
          backgroundImage: `linear-gradient(135deg, ${C.emerald}, ${C.amethyst})`,
          color: "#0A0A0C",
        }}
      >
        {CURRENT_USER.name.charAt(0)}
      </div>
    </div>
  );
}

/* Shared category filter bar - lifted out so Feed and Map can share one
activeFilter state (owned by VibePassApp) instead of each tab losing the
other's selection when you switch between them. */
function FilterChips({ activeFilter, setActiveFilter }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 vp-noscroll">
      {FILTERS.map((f) => {
        const active = activeFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
            style={
              active
                ? {
                    background: C.emerald,
                    color: "#052E16",
                    border: `1px solid ${C.emerald}`,
                  }
                : {
                    background: C.surface,
                    color: C.textMid,
                    border: `1px solid ${C.line}`,
                  }
            }
            aria-pressed={active}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/* Feed tab - pure browsable list, no map. Spec: nav shows "Feed, Map,
Tickets, and Profile" as four parallel destinations, so Feed is now its
own screen rather than living underneath the map. Shows every listing
(not just what's in the map viewport) so Dubai listings are reachable
without ever touching the map. */
function FeedView({ events, activeFilter, setActiveFilter, onSelect, selectedId }) {
  const feedEvents = useMemo(
    () =>
      activeFilter === "all"
        ? events
        : events.filter((e) => e.category === activeFilter),
    [events, activeFilter]
  );

  return (
    <div className="px-4 pt-2">
      <AppHeader />
      <div className="mt-4">
        <FilterChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: C.textHi }}>
          Discover
        </h2>
        <span className="text-xs" style={{ color: C.textLo }}>
          {feedEvents.length} {feedEvents.length === 1 ? "experience" : "experiences"}
        </span>
      </div>
      <p className="mt-0.5 text-xs" style={{ color: C.textLo }}>
        Tap a card for full details - Dubai listings included.
      </p>
      {feedEvents.length === 0 ? (
        <div
          className="mt-3 flex flex-col items-center gap-2 rounded-3xl border px-6 py-8 text-center"
          style={{ borderColor: C.line, background: C.surface }}
        >
          <Compass size={22} color={C.textLo} />
          <p className="text-sm font-semibold" style={{ color: C.textHi }}>
            Nothing in this category yet
          </p>
          <p className="text-xs" style={{ color: C.textMid }}>
            Try another category from the bar above.
          </p>
        </div>
      ) : (
        <div
          key={activeFilter}
          className="mt-3 flex flex-col gap-3"
          style={{ animation: "vpFadeIn 0.35s ease" }}
        >
          {feedEvents.map((ev) => (
            <FeedCard key={ev.id} ev={ev} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

/* Search tab - text search over the same combinedEvents pool Feed and
   Map already share, reusing FeedCard for results so a searched event
   looks identical to one found by browsing. Same substring-match
   approach as the landing page's PreviewGrid, but against this app's
   actual event fields (title/venue/zone/tag/category/organizer) -
   including organizer means searching a promoter's name (e.g. "Oryx")
   surfaces everything they've posted. */
function SearchView({ events, onSelect, selectedId }) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return events.filter((e) => {
      const hay = [e.title, e.venue, e.zone, e.tag, e.category, e.organizer]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [events, query]);

  return (
    <div className="px-4 pt-2">
      <AppHeader />
      <div
        className="mt-4 flex items-center gap-2 rounded-full border p-1.5"
        style={{ borderColor: C.line, background: C.surface }}
      >
        <Search size={16} color={C.textLo} className="ml-2 shrink-0" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events, venues, or categories..."
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: C.textHi }}
        />
        {query ? (
          <button
            onClick={() => setQuery("")}
            className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{ background: C.surfaceHi }}
            aria-label="Clear search"
          >
            <X size={12} color={C.textMid} />
          </button>
        ) : null}
      </div>
      {!query ? (
        <div
          className="mt-3 flex flex-col items-center gap-2 rounded-3xl border px-6 py-8 text-center"
          style={{ borderColor: C.line, background: C.surface }}
        >
          <Search size={22} color={C.textLo} />
          <p className="text-sm font-semibold" style={{ color: C.textHi }}>
            Search VibePass
          </p>
          <p className="text-xs" style={{ color: C.textMid }}>
            Find events by name, venue, or category.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div
          className="mt-3 flex flex-col items-center gap-2 rounded-3xl border px-6 py-8 text-center"
          style={{ borderColor: C.line, background: C.surface }}
        >
          <Compass size={22} color={C.textLo} />
          <p className="text-sm font-semibold" style={{ color: C.textHi }}>
            No results for &quot;{query}&quot;
          </p>
          <p className="text-xs" style={{ color: C.textMid }}>
            Try a different event, venue, or category name.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3" style={{ animation: "vpFadeIn 0.35s ease" }}>
          <p className="text-xs" style={{ color: C.textLo }}>
            {results.length} {results.length === 1 ? "result" : "results"}
          </p>
          {results.map((ev) => (
            <FeedCard key={ev.id} ev={ev} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

/* Map tab - dedicated full-height map, no feed list competing for space.
Splitting this out of the old combined Explore screen means the map is no
longer capped at a fixed 340px; it now fills whatever room is left after
the header and filter bar (DiscoveryMap's own container is flex-1). */
function MapView({ events, activeFilter, setActiveFilter, onSelect, selectedId }) {
  const mapRef = useRef(null);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const lastSearchedRef = useRef(null);

  const filteredEvents = useMemo(
    () =>
      activeFilter === "all"
        ? visibleEvents
        : visibleEvents.filter((e) => e.category === activeFilter),
    [visibleEvents, activeFilter]
  );

  const runSearch = useCallback((instant = false) => {
    const finish = () => {
      const m = mapRef.current;
      if (!m) return;
      const bounds = m.getVisibleBounds();
      const found = events.filter(
        (e) =>
          e.lat >= bounds.latMin &&
          e.lat <= bounds.latMax &&
          e.lng >= bounds.lngMin &&
          e.lng <= bounds.lngMax
      );
      setVisibleEvents(found);
      lastSearchedRef.current = m.getCenterAndScale();
      setShowSearch(false);
      setSearching(false);
    };
    if (instant) {
      finish();
      return;
    }
    setSearching(true);
    window.setTimeout(finish, 800);
  }, [events]);

  /* Runs once on mount - the SVG map has no async load to wait for, so
  the imperative handle is already populated by this point. */
  useEffect(() => {
    runSearch(true);
  }, [runSearch]);

  const evaluateShift = useCallback(() => {
    const m = mapRef.current;
    if (!m || !lastSearchedRef.current || searching) return;
    const last = lastSearchedRef.current;
    const now = m.getCenterAndScale();
    const movedMeters = haversineMeters(now.lat, now.lng, last.lat, last.lng);
    const scaleChanged = now.k / last.k > 1.25 || last.k / now.k > 1.25;
    if (movedMeters > SHIFT_THRESHOLD_M || scaleChanged) {
      setShowSearch(true);
    }
  }, [searching]);

  return (
    <div className="flex h-full flex-col px-4 pt-2">
      <AppHeader />
      <div className="mt-4 shrink-0">
        <FilterChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <DiscoveryMap
          ref={mapRef}
          visibleEvents={filteredEvents}
          onSelect={onSelect}
          selectedId={selectedId}
          showSearch={showSearch}
          searching={searching}
          onSearchArea={() => runSearch(false)}
          onViewChange={evaluateShift}
        />
      </div>
      <p className="mt-2 shrink-0 text-center text-xs" style={{ color: C.textLo }}>
        Drag or pinch the map, then tap "Search this area" to refresh pins.
      </p>
    </div>
  );
}

/* Discovery feed card - category tag, Vibe Ticket price, talent count */
function FeedCard({ ev, onSelect }) {
  const isVenue = ev.type === "venue";
  return (
    <button
      onClick={() => onSelect(ev)}
      className="relative w-full overflow-hidden rounded-3xl border text-left transition-transform active:scale-95"
      /* Each event already carries an accent used by its tag and pin; reusing
         it here colours the whole feed without inventing a new palette. The
         alpha keeps it a tint rather than an outline. */
      style={{
        borderColor: `${ev.accent}59`,
        background: C.surface,
        boxShadow: `0 6px 20px rgba(0,0,0,0.35), 0 0 18px ${ev.accent}1F`,
      }}
    >
      <div
        className="relative h-40 w-full overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${C.surfaceHi}, ${C.bg})`,
        }}
      >
        <CoverImage src={ev.img} alt={ev.title} accent={ev.accent} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to top, rgba(10,10,12,0.9), rgba(10,10,12,0.05) 55%)",
          }}
        />
        <span
          className="absolute top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase"
          style={{
            background: "rgba(10,10,12,0.85)",
            border: `1px solid ${ev.accent}`,
            color: ev.accent,
            letterSpacing: 1.2,
          }}
        >
          {CATEGORY_LABELS[ev.category]}
        </span>
        <span
          className="absolute top-3 right-3 flex flex-col items-end rounded-2xl px-2.5 py-1.5"
          style={{
            background: "rgba(10,10,12,0.85)",
            border: `1px solid ${C.line}`,
          }}
        >
          <span
            className="font-bold uppercase"
            style={{ fontSize: 9, letterSpacing: 1.5, color: C.textLo }}
          >
            Vibe Ticket
          </span>
          <span className="text-sm font-bold" style={{ color: C.emerald }}>
            {isVenue ? ev.tier : `From AED ${ev.price}`}
          </span>
        </span>
      </div>
      <div className="p-4">
        <p className="text-base font-bold leading-snug" style={{ color: C.textHi }}>
          {ev.title}
        </p>
        <div
          className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
          style={{ color: C.textMid }}
        >
          <span className="flex items-center gap-1">
            <Calendar size={11} color={ev.accent} />
            {isVenue ? `${ev.hours} ${ev.days}` : ev.date}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} color={ev.accent} />
            {ev.zone}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: "rgba(34,197,94,0.12)", color: C.emerald }}
          >
            <ShieldCheck size={12} /> {ev.talent}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: C.textLo }}>
            <BadgeCheck size={11} color={C.amethyst} />
            {isVenue ? "DCT licensed" : "Permit verified"}
          </span>
        </div>
      </div>
    </button>
  );
}

/* Booking flow - tier / seat selector, quantity, live total, NFC pass */
function BookingFlow({ event, onComplete, onGoWallet, onClose, setLocked }) {
  const options = event.ticketOptions;
  const [optionId, setOptionId] = useState(options[0].id);
  const [qty, setQty] = useState(1);
  const [stage, setStage] = useState("select"); // select | processing | confirmed
  /* Lazy initializer: evaluated once on mount, so the order reference stays
  stable across re-renders and is safe to read during render. */
  const [orderId] = useState(
    () => `VP-${Date.now().toString(36).toUpperCase().slice(-6)}`
  );

  const option = options.find((o) => o.id === optionId) || options[0];
  const maxQty = Math.max(1, Math.min(6, option.left));
  const total = option.price * qty;
  const seatBased = event.pricingType === "seat-selection";

  const pick = (o) => {
    setOptionId(o.id);
    setQty((q) => Math.max(1, Math.min(q, Math.min(6, o.left))));
  };

  const book = () => {
    if (stage !== "select") return;
    setStage("processing");
    setLocked(true);
    window.setTimeout(() => {
      onComplete(event, option, qty, orderId);
      setStage("confirmed");
      setLocked(false);
    }, 1500);
  };

  return (
    <>
      <div className="mt-4">
        <p className="text-sm font-bold" style={{ color: C.textHi }}>
          {seatBased ? "Choose your section" : "Choose your ticket"}
        </p>
        {seatBased && (
          <div className="mt-2 flex justify-center">
            <span
              className="rounded-full px-10 py-1 text-xs font-bold"
              style={{
                backgroundImage: `linear-gradient(90deg, ${C.emerald}33, ${C.amethyst}33)`,
                border: `1px solid ${C.line}`,
                color: C.textMid,
                letterSpacing: 3,
              }}
            >
              {event.category === "sports" ? "PITCH" : "STAGE"}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2.5 flex flex-col gap-2">
        {options.map((o) => {
          const selected = o.id === option.id;
          const scarce = o.left < 10;
          return (
            <button
              key={o.id}
              onClick={() => pick(o)}
              className="w-full rounded-2xl border p-3.5 text-left transition-transform active:scale-95"
              style={
                selected
                  ? {
                      borderColor: C.emerald,
                      background: "rgba(34,197,94,0.08)",
                    }
                  : { borderColor: C.line, background: C.surfaceHi }
              }
              aria-pressed={selected}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.textHi }}>
                    {selected && <BadgeCheck size={14} color={C.emerald} />}
                    {o.name}
                    <span className="text-xs font-medium" style={{ color: C.textLo }}>
                      {" "}{o.subtitle}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: C.textMid }}>
                    {o.perks}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold" style={{ color: C.emerald }}>
                    AED {o.price}
                  </p>
                  <p
                    className="mt-0.5 text-xs"
                    style={{ color: scarce ? C.amethyst : C.textLo }}
                  >
                    {scarce ? `Only ${o.left} left` : `${o.left} left`}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div
        className="mt-3 flex items-center justify-between rounded-2xl border p-3"
        style={{ borderColor: C.line, background: C.surfaceHi }}
      >
        <span className="text-sm font-medium" style={{ color: C.textHi }}>
          Quantity
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border transition-transform active:scale-90"
            style={{
              borderColor: C.line,
              background: C.bg,
              opacity: qty <= 1 ? 0.35 : 1,
            }}
            aria-label="Decrease quantity"
          >
            <Minus size={14} color={C.textHi} />
          </button>
          <span className="w-6 text-center text-base font-bold" style={{ color: C.textHi }}>
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            className="flex h-8 w-8 items-center justify-center rounded-full border transition-transform active:scale-90"
            style={{
              borderColor: C.line,
              background: C.bg,
              opacity: qty >= maxQty ? 0.35 : 1,
            }}
            aria-label="Increase quantity"
          >
            <Plus size={14} color={C.textHi} />
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xs" style={{ color: C.textLo }}>
            Total {qty} x {option.name} incl. VAT
          </p>
          <p
            key={total}
            className="text-2xl font-bold"
            style={{ color: C.textHi, animation: "vpPop 0.25s ease" }}
          >
            {fmtAED(total)}
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
          style={{ border: `1px solid ${C.line}`, color: C.textMid }}
        >
          <Lock size={11} color={C.amethyst} /> Escrow-secured
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-end gap-1.5 text-xs" style={{ color: C.textLo }}>
        Paying with <GoogleG size={12} />
        <span className="font-semibold" style={{ color: C.textMid }}>
          Pay
        </span>
      </div>
      <button
        onClick={book}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-transform active:scale-95"
        style={{ background: C.emerald, color: "#052E16" }}
        aria-label="Book tickets"
      >
        <Ticket size={16} />
        Book Tickets {fmtAED(total)}
      </button>
      <p className="mt-2.5 text-center text-xs" style={{ color: C.textLo }}>
        Funds held in a licensed AED escrow vault until entry validation.
      </p>
      {stage === "processing" && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-8 text-center"
          style={{
            background: "rgba(10,10,12,0.97)",
            animation: "vpFadeIn 0.2s ease",
          }}
        >
          <div
            className="h-11 w-11 rounded-full animate-spin"
            style={{ border: "3px solid #2A2F3A", borderTopColor: C.emerald }}
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: C.textHi }}>
              Contacting your bank...
            </p>
            <p className="mt-1 text-xs" style={{ color: C.textMid }}>
              Authorising {fmtAED(total)} via Google Pay
            </p>
          </div>
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{ border: `1px solid ${C.line}`, color: C.textMid }}
          >
            <Lock size={11} /> 3-D Secure encrypted
          </span>
        </div>
      )}
      {stage === "confirmed" && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto px-6 py-8 text-center vp-noscroll"
          style={{
            background: "rgba(10,10,12,0.98)",
            animation: "vpFadeIn 0.25s ease",
          }}
        >
          <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
            <span
              className="absolute h-28 w-28 rounded-full border-2"
              style={{
                borderColor: C.emerald,
                animation: "vpNfcPulse 2.1s ease-out infinite",
              }}
            />
            <span
              className="absolute h-28 w-28 rounded-full border-2"
              style={{
                borderColor: C.amethyst,
                animation: "vpNfcPulse 2.1s ease-out 0.7s infinite",
              }}
            />
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-3xl p-0.5"
              style={{
                backgroundImage: `linear-gradient(135deg, ${C.emerald}, ${C.amethyst})`,
              }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-3xl" style={{ background: C.bg }}>
                <ContactlessIcon size={30} color="#FFFFFF" />
                <span className="font-bold uppercase" style={{ fontSize: 8, letterSpacing: 2, color: C.textMid }}>
                  Vibe Pass
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-lg font-bold" style={{ color: C.textHi }}>
            Vibe Pass Activated
          </p>
          <p className="mt-1 text-xs" style={{ color: C.textMid }}>
            {qty} x {option.name} ({option.subtitle}) - {event.title}
          </p>
          <div
            className="mt-4 w-full rounded-2xl border p-3.5"
            style={{ borderColor: C.line, background: C.surfaceHi }}
          >
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: C.textLo }}>Order</span>
              <span className="font-mono font-semibold" style={{ color: C.textHi }}>
                {orderId}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span style={{ color: C.textLo }}>Paid via Google Pay</span>
              <span className="font-bold" style={{ color: C.emerald }}>
                {fmtAED(total)}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs" style={{ color: C.textLo }}>
            Hold your phone near the gate reader - your rotating entry token is live in the wallet.
          </p>
          <button
            onClick={onGoWallet}
            className="mt-4 flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full text-sm font-bold transition-transform active:scale-95"
            style={{ background: C.emerald, color: "#052E16" }}
          >
            <Ticket size={16} />
            View in Wallet
          </button>
          <button
            onClick={onClose}
            className="mt-2 flex h-11 w-full shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-transform active:scale-95"
            style={{
              background: C.surfaceHi,
              border: `1px solid ${C.line}`,
              color: C.textHi,
            }}
          >
            Done
          </button>
        </div>
      )}
    </>
  );
}

/* Detail bottom sheet - ticket booking or venue actions */
function EventSheet({ event, onComplete, onGoWallet, onBook, onMenu, onClose }) {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    setLocked(false);
  }, [event ? event.id : null]);

  if (!event) return null;
  const isVenue = event.type === "venue";

  return (
    <div className="absolute inset-0 flex flex-col justify-end" style={{ zIndex: 1300 }}>
      <button
        onClick={() => !locked && onClose()}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }}
        aria-label="Close details"
      />
      <div
        className="relative z-10 flex flex-col overflow-hidden rounded-t-3xl border-t"
        style={{
          background: C.surface,
          borderColor: C.line,
          maxHeight: "92%",
          animation: "vpSlideUp 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div className="overflow-y-auto vp-noscroll">
          <div
            className="relative h-52 w-full overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(135deg, ${C.surfaceHi}, ${C.bg})`,
            }}
          >
            <CoverImage src={event.img} alt={event.title} accent={event.accent} />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "linear-gradient(to top, rgba(17,19,24,1), rgba(17,19,24,0) 55%)",
              }}
            />
            <div className="absolute top-2 left-0 right-0 flex justify-center">
              <span className="h-1 w-10 rounded-full" style={{ background: "rgba(255,255,255,0.35)" }} />
            </div>
            <button
              onClick={() => !locked && onClose()}
              className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
              style={{
                background: "rgba(10,10,12,0.75)",
                border: `1px solid ${C.line}`,
              }}
              aria-label="Close"
            >
              <X size={16} color={C.textHi} />
            </button>
            <span
              className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: "rgba(10,10,12,0.8)",
                border: `1px solid ${event.accent}`,
                color: event.accent,
              }}
            >
              <Sparkles size={11} /> {event.tag}
            </span>
          </div>
          <div className="px-5 pt-4 pb-6">
            <h2 className="text-xl font-bold leading-tight" style={{ color: C.textHi }}>
              {event.title}
            </h2>
            <p className="mt-1 text-sm" style={{ color: C.textMid }}>
              {event.desc}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5 text-sm" style={{ color: C.textMid }}>
                <MapPin size={15} color={event.accent} />
                <span style={{ color: C.textHi }}>{event.venue}</span>
              </div>
              {isVenue ? (
                <>
                  <div className="flex items-center gap-2.5 text-sm" style={{ color: C.textMid }}>
                    <Clock size={15} color={event.accent} />
                    <span style={{ color: C.textHi }}>
                      {event.hours} {event.days}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm" style={{ color: C.textMid }}>
                    <Star size={15} color={event.accent} />
                    <span style={{ color: C.textHi }}>
                      {event.rating} {event.reviews} reviews
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm" style={{ color: C.textMid }}>
                    <Banknote size={15} color={event.accent} />
                    <span style={{ color: C.textHi }}>{event.tier}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 text-sm" style={{ color: C.textMid }}>
                    <Calendar size={15} color={event.accent} />
                    <span style={{ color: C.textHi }}>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm" style={{ color: C.textMid }}>
                    <Clock size={15} color={event.accent} />
                    <span style={{ color: C.textHi }}>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm" style={{ color: C.textMid }}>
                    <Users size={15} color={event.accent} />
                    <span style={{ color: C.textHi }}>{event.capacity}</span>
                  </div>
                </>
              )}
            </div>
            {isVenue ? (
              <div
                className="mt-4 flex items-start gap-3 rounded-2xl p-3.5"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.35)",
                }}
              >
                <ShieldCheck size={18} color={C.emerald} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.emerald }}>
                    DCT-licensed venue
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: C.textMid }}>
                    Tourism licence{" "}
                    <span className="font-mono" style={{ color: C.textHi }}>
                      {event.licence}
                    </span>{" "}
                    on record with DCT Abu Dhabi. Listing verified.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="mt-4 flex items-start gap-3 rounded-2xl p-3.5"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.35)",
                }}
              >
                <ShieldCheck size={18} color={C.emerald} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.emerald }}>
                    Verified organiser permit
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: C.textMid }}>
                    Permit{" "}
                    <span className="font-mono" style={{ color: C.textHi }}>
                      {event.permit}
                    </span>{" "}
                    validated with {event.authority}. Checkout enabled.
                  </p>
                </div>
              </div>
            )}
            {isVenue ? (
              <>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs" style={{ color: C.textLo }}>
                      Typical spend
                    </p>
                    <p className="text-2xl font-bold" style={{ color: C.textHi }}>
                      {event.tier}
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                    style={{
                      background: "rgba(34,197,94,0.12)",
                      color: C.emerald,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ background: C.emerald }}
                    />
                    Open now
                  </span>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => onBook(event)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-transform active:scale-95"
                    style={{ background: C.emerald, color: "#052E16" }}
                    aria-label="Book a table"
                  >
                    <CalendarCheck size={16} />
                    Book a Table
                  </button>
                </div>
                <div className="mt-2.5 flex gap-2.5">
                  <button
                    onClick={() => onMenu(event)}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-transform active:scale-95"
                    style={{
                      background: C.surfaceHi,
                      border: `1px solid ${C.line}`,
                      color: C.textHi,
                    }}
                    aria-label="View menu"
                  >
                    <UtensilsCrossed size={14} color={event.accent} />
                    View Menu
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-transform active:scale-95"
                    style={{
                      background: C.surfaceHi,
                      border: `1px solid ${C.line}`,
                      color: C.textHi,
                    }}
                    aria-label="Get directions"
                  >
                    <Navigation size={14} color={event.accent} />
                    Directions
                  </a>
                </div>
                <p className="mt-2.5 text-center text-xs" style={{ color: C.textLo }}>
                  Reservations are confirmed directly by the venue.
                </p>
              </>
            ) : (
              <BookingFlow
                key={event.id}
                event={event}
                onComplete={onComplete}
                onGoWallet={onGoWallet}
                onClose={onClose}
                setLocked={setLocked}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Rotating security QR + countdown ring */
function CountdownRing({ msLeft, total }) {
  const frac = Math.max(0, Math.min(1, msLeft / total));
  const R = 15.5;
  const CIRC = 2 * Math.PI * R;
  const seconds = Math.max(1, Math.ceil(msLeft / 1000));
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-11 w-11 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke={C.line}
          strokeWidth="3.5"
        />
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke={C.emerald}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - frac)}
          style={{ transition: "stroke-dashoffset 100ms linear" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color: C.emerald }}
      >
        {seconds}
      </span>
    </div>
  );
}

function SecurityQR() {
  const TOTAL = 15000;
  const [msLeft, setMsLeft] = useState(TOTAL);
  const [token, setToken] = useState(() => genToken());

  useEffect(() => {
    const id = setInterval(() => setMsLeft((m) => m - 100), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (msLeft <= 0) {
      setToken(genToken());
      setMsLeft(TOTAL);
    }
  }, [msLeft]);

  const matrix = useMemo(() => buildQrMatrix(token), [token]);
  const justRefreshed = msLeft > TOTAL - 700;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden rounded-2xl bg-white p-3"
        style={{ boxShadow: `0 0 28px ${C.emerald}33` }}
      >
        <svg
          key={token}
          viewBox={`0 0 ${QR_N} ${QR_N}`}
          className="block h-40 w-40"
          style={{ animation: "vpFadeIn 0.45s ease" }}
          role="img"
          aria-label="Rotating entry QR code"
        >
          {matrix.map((row, r) =>
            row.map((on, c) =>
              on ? (
                <rect
                  key={`${r}-${c}`}
                  x={c}
                  y={r}
                  width="1"
                  height="1"
                  rx="0.18"
                  fill={C.bg}
                />
              ) : null
            )
          )}
        </svg>
        <div
          className="pointer-events-none absolute left-0 right-0 h-8"
          style={{
            backgroundImage: "linear-gradient(to bottom, rgba(34,197,94,0), rgba(34,197,94,0.35), rgba(34,197,94,0))",
            animation: "vpScan 3s linear infinite",
          }}
        />
      </div>
      <div className="mt-4 flex w-full items-center gap-3">
        <CountdownRing msLeft={msLeft} total={TOTAL} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.textHi }}>
            <RefreshCw
              size={11}
              color={C.emerald}
              className={justRefreshed ? "animate-spin" : ""}
            />
            Security token refreshing
          </p>
          <p className="mt-0.5 truncate font-mono text-xs" style={{ color: C.textMid }}>
            {token}
          </p>
        </div>
      </div>
    </div>
  );
}

/* Ticket wallet */
function TicketCard({ ticket }) {
  const ev = ticket.event;
  return (
    <div
      className="relative overflow-hidden rounded-3xl border"
      style={{
        borderColor: C.line,
        background: C.surface,
        animation: "vpPop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <div
        className="relative h-24 w-full overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${C.surfaceHi}, ${C.bg})`,
        }}
      >
        <CoverImage src={ev.img} alt={ev.title} accent={ev.accent} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(17,19,24,0.95), rgba(17,19,24,0.35))",
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-center px-4">
          <p className="text-base font-bold leading-tight" style={{ color: C.textHi }}>
            {ev.title}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: C.textMid }}>
            {ev.venue}
          </p>
          <p className="text-xs" style={{ color: C.textMid }}>
            {ev.date} {ev.time}
          </p>
        </div>
        <span
          className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ background: "rgba(34,197,94,0.15)", color: C.emerald }}
        >
          <BadgeCheck size={11} /> Active
        </span>
      </div>
      <div className="relative">
        <div className="mx-4 border-t border-dashed" style={{ borderColor: "#2E323C" }} />
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full" style={{ background: C.bg }} />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full" style={{ background: C.bg }} />
      </div>
      <div className="px-5 pb-4 pt-4">
        <SecurityQR />
        <div className="mt-3 flex justify-center">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "rgba(168,85,247,0.14)", color: C.amethyst }}
          >
            {ticket.qty} x {ticket.option.name} {ticket.option.subtitle}
          </span>
        </div>
        <div
          className="mt-3 grid grid-cols-3 gap-2 rounded-2xl p-3"
          style={{ background: C.surfaceHi, border: `1px solid ${C.line}` }}
        >
          <div>
            <p className="text-xs" style={{ color: C.textLo }}>
              Holder
            </p>
            <p className="text-xs font-semibold" style={{ color: C.textHi }}>
              {ticket.holder}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: C.textLo }}>
              Order
            </p>
            <p className="font-mono text-xs font-semibold" style={{ color: C.textHi }}>
              {ticket.order}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: C.textLo }}>
              Paid
            </p>
            <p className="text-xs font-semibold" style={{ color: C.emerald }}>
              {fmtAED(ticket.total)}
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs" style={{ color: C.textLo }}>
          <ShieldCheck size={11} color={C.emerald} />
          Escrow-secured Permit {ev.permit}
        </p>
      </div>
    </div>
  );
}

function CompactTicket({ ticket, onOpen }) {
  const ev = ticket.event;
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-transform active:scale-95"
      style={{ borderColor: C.line, background: C.surface }}
    >
      <div
        className="h-12 w-12 shrink-0 overflow-hidden rounded-xl"
        style={{
          backgroundImage: `linear-gradient(135deg, ${C.surfaceHi}, ${C.bg})`,
        }}
      >
        <CoverImage src={ev.img} alt="" accent={ev.accent} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: C.textHi }}>
          {ev.title}
        </p>
        <p className="text-xs" style={{ color: C.textMid }}>
          {ticket.qty} x {ticket.option.name} Tap to present
        </p>
      </div>
      <ChevronRight size={16} color={C.textLo} />
    </button>
  );
}

function ConsumerWalletView({ tickets, activeId, setActiveId, goBrowse }) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center px-8 pt-16 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-3xl"
          style={{ background: C.surface, border: `1px solid ${C.line}` }}
        >
          <Ticket size={26} color={C.textLo} />
        </div>
        <p className="mt-4 text-base font-semibold" style={{ color: C.textHi }}>
          No active passes
        </p>
        <p className="mt-1 text-sm" style={{ color: C.textMid }}>
          Buy a ticket and your rotating entry token appears here.
        </p>
        <button
          onClick={goBrowse}
          className="mt-5 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform active:scale-95"
          style={{ background: C.emerald, color: "#052E16" }}
        >
          Explore tonight's events
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: C.textHi }}>
          My Passes
        </h2>
        <p className="text-xs" style={{ color: C.textMid }}>
          Entry tokens rotate every 15 seconds for gate security.
        </p>
      </div>
      {tickets.map((t) =>
        t.id === activeId ? (
          <TicketCard key={t.id} ticket={t} />
        ) : (
          <CompactTicket
            key={t.id}
            ticket={t}
            onOpen={() => setActiveId(t.id)}
          />
        )
      )}
    </div>
  );
}

/* Profile */
function ConsumerProfileView() {
  const rows = [
    {
      icon: <User size={16} color={C.emerald} />,
      label: "Account Type",
      value: "Consumer",
      valueColor: C.emerald,
    },
    {
      icon: <BadgeCheck size={16} color={C.emerald} />,
      label: "UAE Pass",
      value: CURRENT_USER.uaePassVerified ? "Verified" : "Not linked",
      valueColor: CURRENT_USER.uaePassVerified ? C.emerald : C.textLo,
    },
    {
      icon: <ShieldCheck size={16} color={C.amethyst} />,
      label: "Emirates ID",
      value: `Linked -${CURRENT_USER.emiratesIdSuffix}`,
      valueColor: C.textMid,
    },
    {
      icon: <GoogleG size={15} />,
      label: "Payment method",
      value: "Google Pay",
      valueColor: C.textMid,
    },
  ];

  return (
    <div className="px-4 pt-6">
      <div className="flex flex-col items-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold"
          style={{
            backgroundImage: `linear-gradient(135deg, ${C.emerald}, ${C.amethyst})`,
            color: "#0A0A0C",
          }}
        >
          {CURRENT_USER.name.charAt(0)}
        </div>
        <p className="mt-3 text-lg font-bold" style={{ color: C.textHi }}>
          {CURRENT_USER.name}
        </p>
        <span
          className="mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
          style={{ background: "rgba(34,197,94,0.12)", color: C.emerald }}
        >
          <BadgeCheck size={11} /> Verified member
        </span>
      </div>
      <div
        className="mt-6 overflow-hidden rounded-3xl border"
        style={{ borderColor: C.line, background: C.surface }}
      >
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}
          >
            {r.icon}
            <span className="flex-1 text-sm" style={{ color: C.textHi }}>
              {r.label}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: r.valueColor }}
            >
              {r.value}
            </span>
            <ChevronRight size={14} color={C.textLo} />
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs" style={{ color: C.textLo }}>
        Epicenter Technologies LTD Vibe Pass v2.8.0
      </p>
      <p className="mt-1 text-center text-xs" style={{ color: C.textLo }}>
        Events ticketing regulated under DCT Abu Dhabi.
      </p>
    </div>
  );
}

/* Bottom navigation - Material 3 */
function BottomNav({ tab, setTab, ticketCount, role }) {
  const items = CONSUMER_NAV_ITEMS.filter((it) => it.roles.includes(role));

  return (
    <div
      className="shrink-0 border-t"
      style={{ background: "#0D0F13", borderColor: C.line }}
    >
      <div className="flex items-stretch justify-around px-2 pt-2">
        {items.map((it) => {
          const active = tab === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className="flex w-20 flex-col items-center gap-1 py-1 transition-transform active:scale-95"
              aria-label={it.label}
            >
              <span
                className="relative flex h-8 w-14 items-center justify-center rounded-full transition-colors"
                style={{
                  background: active ? "rgba(34,197,94,0.16)" : "transparent",
                }}
              >
                <Icon
                  size={19}
                  color={active ? C.emerald : C.textLo}
                  strokeWidth={active ? 2.4 : 2}
                />
                {it.id === "tickets" && ticketCount > 0 && (
                  <span
                    className="absolute -top-0.5 right-2 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: C.amethyst, color: "#FFFFFF" }}
                  >
                    {ticketCount}
                  </span>
                )}
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: active ? C.textHi : C.textLo }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-center pb-2 pt-1.5">
        <span
          className="h-1 w-28 rounded-full"
          style={{ background: "rgba(255,255,255,0.28)" }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   NAVIGATION
   ============================================================ */
const TALENT_NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "portfolio", label: "Portfolio", icon: Sparkles },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
  { id: "profile", label: "Profile", icon: User },
];

/* ============================================================
   TALENT PROFILE + MILESTONE TARGETS
   ============================================================ */
const TALENT = {
  name: "Marcus Reyes",
  avatarInitial: "M",
  craft: "DJ / Music Producer",
  memberSinceISO: "2026-01-05",
  memberSinceLabel: "5 January 2026",
  rating: 4.9,
  totalGigs: 34,
};

const MILESTONE_TARGETS = {
  independentAgentVenues: 6,
  vibePioneerStreak: 10,
  mentorshipMonths: 6,
  restRewardWeeks: 6,
  feeFreeGigs: 4,
};

const FREE_AGENT_RATE_BOOST_PCT = 15;
const BASE_RATE_AED = 1800;

/* ============================================================
   ONBOARDING / VERIFICATION DATA (retained + restyled)
   ============================================================ */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

const stepMeta = [
  { id: 1, label: "Identity" },
  { id: 2, label: "Documents" },
  { id: 3, label: "Authorization" },
];

const workAuthOptions = [
  {
    value: "mohre",
    label: "MoHRE Part-Time Permit",
    description: "Sponsored work permit issued by the Ministry of Human Resources & Emiratisation.",
    icon: Briefcase,
  },
  {
    value: "freezone",
    label: "Free Zone Freelance License",
    description: "Independent freelance license issued by an accredited UAE free zone authority.",
    icon: Building2,
  },
];

const vettingChecklist = [
  { threshold: 20, label: "Emirates ID validated" },
  { threshold: 45, label: "MoHRE authorization cross-checked" },
  { threshold: 70, label: "Compliance documents verified" },
  { threshold: 100, label: "Background vetting cleared" },
];

const badgeChecklist = [
  "UAE Pass digital identity confirmed",
  "Emirates ID and passport verified",
  "Work authorization documents approved",
];

/* ============================================================
   TALENT PASS TAB DATA - milestones, incentives, portfolio
   (grounded in the same Abu Dhabi venues consumers book on
   Vibe Pass, so a talent's history lines up with real listings)
   ============================================================ */
const SEED_MENTEES = [
  { id: "m1", name: "Priya N.", craft: "Vocalist / Host", joined: "2 May 2026", bonus: 180 },
  { id: "m2", name: "Omar K.", craft: "DJ", joined: "14 Jun 2026", bonus: 120 },
];

const SEED_DIVIDENDS = [
  { id: "d1", event: "Hangar Nights Vol. 4", venue: "KC Industrial Hangar 7", date: shortDate(-48), pct: 34, amount: 210 },
  { id: "d2", event: "Yas Bass Sessions — Vol. 3", venue: "Etihad Park, Yas Island", date: shortDate(-69), pct: 18, amount: 95 },
];

const SEED_PAYOUTS = [
  { id: "p1", date: shortDate(-41), event: "Corniche Sunset Sessions", gross: 2100, fee: 84, status: "Paid" },
  { id: "p2", date: shortDate(-48), event: "Hangar Nights Vol. 4", gross: 2600, fee: 0, status: "Paid" },
  { id: "p3", date: shortDate(-55), event: "Maryah Rooftop Series", gross: 1450, fee: 58, status: "Paid" },
  { id: "p4", date: shortDate(-69), event: "Yas Bass Sessions — Vol. 3", gross: 1900, fee: 76, status: "Paid" },
];

const SEED_PORTFOLIO = [
  {
    id: "port1",
    event: "Corniche Sunset Sessions",
    venue: "Corniche Beach, Gate 2",
    date: shortDate(-41),
    crowd: 2300,
    topTrack: "Tideline",
    rating: 4.9,
    lat: 24.4741,
    lng: 54.3369,
    img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "port2",
    event: "Hangar Nights Vol. 4",
    venue: "KC Industrial Hangar 7",
    date: shortDate(-48),
    crowd: 3900,
    topTrack: "Concrete Bloom",
    rating: 5.0,
    lat: 24.4203,
    lng: 54.5769,
    img: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "port3",
    event: "Maryah Rooftop Series",
    venue: "The Galleria Rooftop, Al Maryah",
    date: shortDate(-55),
    crowd: 1150,
    topTrack: "Nightfall Groove",
    rating: 4.8,
    lat: 24.5008,
    lng: 54.3894,
    img: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "port4",
    event: "Yas Bass Sessions — Vol. 3",
    venue: "Etihad Park, Yas Island",
    date: shortDate(-69),
    crowd: 6200,
    topTrack: "Solar Drift (Original Mix)",
    rating: 4.9,
    lat: 24.4646,
    lng: 54.6019,
    img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
  },
];

const SEED_BOOKINGS = [
  {
    id: "book1",
    event: "Full Throttle Afterparty",
    venue: "Yas Marina, Trackside Deck",
    date: eventDate(5),
    startsAt: offsetTime(5),
    time: "22:00 - 04:00",
    payout: 3200,
    lat: 24.4593,
    lng: 54.6067,
  },
  {
    id: "book2",
    event: "Desert Bass Warehouse",
    venue: "KC Industrial Hangar 7",
    date: eventDate(14),
    startsAt: offsetTime(14),
    time: "21:00 - 03:00",
    payout: 2600,
    lat: 24.4203,
    lng: 54.5769,
  },
];

const SEED_REQUESTS = [
  {
    id: "req1",
    event: "Corniche Beats Open-Air",
    venue: "Corniche Beach, Gate 2",
    date: eventDate(13),
    time: "18:30 - 00:00",
    rate: 2400,
    note: "Closing set before the 400-drone light show.",
    lat: 24.4741,
    lng: 54.3369,
  },
  {
    id: "req2",
    event: "Amethyst Sky Lounge — Members Night",
    venue: "Level 32, Al Maryah Tower",
    date: eventDate(25),
    time: "21:00 - 01:00",
    rate: 1600,
    note: "Resident DJ slot, 3-hour rooftop set.",
    lat: 24.4996,
    lng: 54.3922,
  },
];

const SEED_TIPS = [
  { id: "t1", from: "Anonymous fan", amount: 50, note: "Amazing set at the hangar!", date: shortDate(-47) },
  { id: "t2", from: "Layla A.", amount: 100, note: "Best night of the summer.", date: shortDate(-48) },
  { id: "t3", from: "Anonymous fan", amount: 30, note: "That closing track though.", date: shortDate(-54) },
];

const COMMUNITY_VOTE = {
  question: "What should the Talent Pass fund next?",
  options: [
    { id: "v1", label: "Faster instant payouts" },
    { id: "v2", label: "More festival headline slots" },
    { id: "v3", label: "Expanded mentorship funding" },
  ],
};

const HEADLINE_SLOTS = [
  { id: "hs1", event: "Saadiyat Beach Club — New Year's Eve", venue: "Solace Beach Club, Saadiyat", date: shortDate(131), rate: 5200 },
  { id: "hs2", event: "Etihad Arena Takeover", venue: "Etihad Arena, Yas Bay", date: shortDate(21), rate: 4600 },
];

const CREDIT_CATALOG = [
  { id: "gear", label: "15% off Pioneer DJ gear", detail: "Any Pioneer DJ UAE retail partner", cost: 300, icon: Music2 },
  { id: "studio", label: "2 hrs free studio time", detail: "Sonic Loft Recording, Al Quoz", cost: 450, icon: Mic2 },
  { id: "marketing", label: "AED 200 marketing credit", detail: "Boost your own gigs on Vibe Pass", cost: 500, icon: Megaphone },
  { id: "mastering", label: "1 free mix mastering session", detail: "Delivered digitally within 48 hrs", cost: 250, icon: Sparkles },
];

const INSTANT_FEE_PCT = 2;
const INITIAL_WALLET_BALANCE_AED = 1240;
const WEEKLY_GIGS_THIS_WEEK = 4;
const REST_REWARD_STIPEND_AED = 400;

const CRAFT_OPTIONS = ["DJ / Producer", "Live Band", "Vocalist / Host", "Dancer", "MC / Host", "Comedian"];
const GENRE_OPTIONS = ["Deep House", "Techno", "Afrobeat", "Hip-Hop", "Arabic Fusion", "Chill / Lounge", "Bass / DnB", "Top 40"];

const INITIAL_EPK = {
  craft: "DJ / Producer",
  bio: "Abu Dhabi-based DJ and producer blending deep house with regional textures. Resident across three Yas Island venues, four seasons running.",
  genres: ["Deep House", "Techno", "Afrobeat"],
  rateRange: "AED 1,800 - 3,500 / set",
  instagram: "@marcusreyes",
  soundcloud: "soundcloud.com/marcusreyes",
  visible: true,
};

/* ============================================================
   UTILITIES
   ============================================================ */
const fmtAEDRound = (n) => `AED ${Math.round(n).toLocaleString()}`;

const formatEmiratesId = (raw) => {
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  let formatted = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i === 3 || i === 7 || i === 14) formatted += "-";
    formatted += digits[i];
  }
  return formatted;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getSubmitStatusText = (progress) => {
  if (progress < 20) return "Validating Emirates ID records...";
  if (progress < 45) return "Cross-checking MoHRE authorization...";
  if (progress < 70) return "Verifying compliance documents...";
  if (progress < 100) return "Finalizing background vetting...";
  return "Verification complete";
};

const generateVerificationId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `VP-${suffix}`;
};

const formatIssueDate = (date) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const isAcceptedFileType = (file) => {
  if (ACCEPTED_FILE_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
};

function monthsSince(iso) {
  const start = new Date(iso);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

/* The accent bar is the cheapest way to get the palette onto every section
   heading in the app: six call sites, one rule, and headings stop reading as
   plain bold text on a flat surface. */
function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: C.textHi }}>
        <span
          aria-hidden="true"
          className="inline-block h-4 w-1 rounded-full"
          style={{ backgroundImage: `linear-gradient(180deg, ${C.emerald}, ${C.amethyst})` }}
        />
        {children}
      </h2>
      {right}
    </div>
  );
}

function ProgressBar({ value, max, color = C.emerald, height = 8, trackColor = C.line }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: trackColor }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, transition: "width 500ms ease" }}
      />
    </div>
  );
}

function RadialProgress({ value, max, size = 44, stroke = 4, color = C.emerald, trackColor = C.line, children }) {
  const frac = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

function StarRating({ value, size = 12 }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={size} fill={C.gold} color={C.gold} />
      <span className="text-xs font-bold" style={{ color: C.textHi }}>{value.toFixed(1)}</span>
    </span>
  );
}

function Pill({ children, color = C.textMid, bg = "rgba(255,255,255,0.05)", border, icon }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: bg, color, border: border ? `1px solid ${border}` : "none" }}
    >
      {icon}
      {children}
    </span>
  );
}

/* ============================================================
   VERIFICATION FLOW - Identity -> Documents -> Authorization
   Retained in full from the original talent onboarding wizard,
   restyled onto shared tokens, now launched from Profile as a
   replayable overlay rather than a hard gate in front of the hub.
   ============================================================ */
function Stepper({ currentStep }) {
  return (
    <div className="flex items-center">
      {stepMeta.map((step, idx) => {
        const isComplete = currentStep > step.id;
        const isActive = currentStep === step.id;
        return (
          <Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  backgroundColor: isComplete ? C.emerald : isActive ? C.amethyst : C.surfaceHi,
                  color: isComplete || isActive ? C.bg : C.textLo,
                  boxShadow: isActive ? `0 0 0 4px ${C.amethyst}30` : "none",
                }}
              >
                {isComplete ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span className="text-xs font-semibold" style={{ color: isActive ? C.textHi : C.textLo }}>
                {step.label}
              </span>
            </div>
            {idx < stepMeta.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-500"
                style={{ backgroundColor: currentStep > step.id ? C.emerald : C.surfaceHi }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function StepIdentity({ uaePassLinked, uaePassLoading, onLink }) {
  return (
    <div className="flex flex-col items-center text-center pt-4">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: uaePassLinked ? `linear-gradient(135deg, ${C.emerald}, #16A34A)` : `linear-gradient(135deg, ${C.amethyst}, #7C3AED)`,
          boxShadow: uaePassLinked ? `0 8px 30px ${C.emerald}40` : `0 8px 30px ${C.amethyst}40`,
        }}
      >
        {uaePassLoading ? (
          <Loader2 className="w-9 h-9 text-white animate-spin" />
        ) : uaePassLinked ? (
          <ShieldCheck className="w-9 h-9 text-white" />
        ) : (
          <Fingerprint className="w-9 h-9 text-white" />
        )}
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: C.textHi }}>
        {uaePassLinked ? "Identity Verified" : "Verify Your Digital Identity"}
      </h2>
      <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: C.textMid }}>
        {uaePassLinked
          ? "Your national digital identity has been confirmed and securely linked to your Vibe Pass talent profile."
          : "Link your UAE Pass account to confirm your national digital identity before continuing."}
      </p>
      {!uaePassLinked ? (
        <button
          type="button"
          onClick={onLink}
          disabled={uaePassLoading}
          className={`w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed ${focusRing}`}
          style={{
            background: `linear-gradient(135deg, ${C.amethyst}, #7C3AED)`,
            color: "#FFFFFF",
            boxShadow: `0 4px 20px ${C.amethyst}50`,
          }}
        >
          {uaePassLoading ? (
            <Fragment>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying your digital identity...
            </Fragment>
          ) : (
            <Fragment>
              <Fingerprint className="w-4 h-4" />
              Link with UAE Pass
            </Fragment>
          )}
        </button>
      ) : (
        <div className="w-full rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: C.emeraldDim, border: `1px solid ${C.emerald}40` }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.emerald }}>
            <Check className="w-5 h-5" style={{ color: C.bg }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: C.textHi }}>UAE Pass Confirmed</p>
            <p className="text-xs" style={{ color: C.textMid }}>ID 784-••••-•••••••-•</p>
          </div>
        </div>
      )}
      {!uaePassLinked && !uaePassLoading && (
        <div className="flex items-center gap-2 mt-6 px-4 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
          <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.textLo }} />
          <p className="text-xs leading-snug text-left" style={{ color: C.textLo }}>
            Your credentials are encrypted and never stored on Vibe Pass servers.
          </p>
        </div>
      )}
    </div>
  );
}

function StepDocuments({ emiratesDigits, onEmiratesChange, passportFile, onPassportPick, onPassportRemove, passportInputRef, passportError }) {
  const isValidId = emiratesDigits.length === 15;
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: C.textHi }}>Identity Documents</h2>
        <p className="text-sm" style={{ color: C.textMid }}>Enter your Emirates ID and upload your passport photo page.</p>
      </div>
      <div>
        <label htmlFor="emiratesIdInput" className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: C.textMid }}>
          <CreditCard className="w-3.5 h-3.5" style={{ color: C.amethyst }} />
          Emirates ID Number
        </label>
        <div className="relative">
          <input
            id="emiratesIdInput"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={formatEmiratesId(emiratesDigits)}
            onChange={onEmiratesChange}
            placeholder="784-YYYY-NNNNNNN-C"
            maxLength={18}
            className={`w-full rounded-2xl pl-4 pr-12 py-4 text-base font-mono tracking-wide outline-none transition-colors duration-200 ${focusRing}`}
            style={{ backgroundColor: C.surface, border: `1.5px solid ${isValidId ? C.emerald : C.borderStrong}`, color: C.textHi }}
          />
          {isValidId && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: C.emerald }}>
              <Check className="w-3.5 h-3.5" style={{ color: C.bg }} />
            </div>
          )}
        </div>
        <p className="text-xs mt-1.5 ml-1 font-medium" style={{ color: isValidId ? C.emerald : C.textLo }}>
          {isValidId ? "Valid Emirates ID format" : `${emiratesDigits.length} of 15 digits entered`}
        </p>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: C.textMid }}>
          <FileText className="w-3.5 h-3.5" style={{ color: C.amethyst }} />
          Passport Photo Page
        </label>
        <input ref={passportInputRef} type="file" accept="image/*,.pdf" onChange={onPassportPick} className="hidden" />
        {!passportFile ? (
          <button
            type="button"
            onClick={() => passportInputRef.current && passportInputRef.current.click()}
            className={`w-full rounded-2xl flex flex-col items-center justify-center gap-2.5 py-9 transition-all duration-200 active:scale-95 ${focusRing}`}
            style={{ backgroundColor: C.surface, border: `1.5px dashed ${C.borderStrong}` }}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: C.amethystDim }}>
              <UploadCloud className="w-5 h-5" style={{ color: C.amethyst }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: C.textHi }}>Tap to upload</p>
              <p className="text-xs mt-0.5" style={{ color: C.textLo }}>JPG, PNG or PDF &middot; Max 10MB</p>
            </div>
          </button>
        ) : (
          <div className="w-full rounded-2xl p-3.5 flex items-center gap-3" style={{ backgroundColor: C.surface, border: `1.5px solid ${C.emerald}50` }}>
            {passportFile.previewUrl ? (
              <img src={passportFile.previewUrl} alt="Passport preview" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.emeraldDim }}>
                <FileText className="w-5 h-5" style={{ color: C.emerald }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: C.textHi }}>{passportFile.name}</p>
              <p className="text-xs" style={{ color: C.textLo }}>{formatFileSize(passportFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={onPassportRemove}
              aria-label="Remove passport file"
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${focusRing}`}
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <X className="w-4 h-4" style={{ color: C.textMid }} />
            </button>
          </div>
        )}
        {passportError && (
          <div className="flex items-center gap-1.5 mt-2 px-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.danger }} />
            <p className="text-xs" style={{ color: C.danger }}>{passportError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepAuthorization({
  workAuthType, onSelectType, dropdownOpen, onToggleDropdown, complianceDoc, onFileSelect, onFileRemove,
  isDragging, onDragOver, onDragLeave, onDrop, fileInputRef, complianceError, dropdownRef,
}) {
  const selectedOption = workAuthOptions.find((o) => o.value === workAuthType) || null;
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: C.textHi }}>Work Authorization</h2>
        <p className="text-sm" style={{ color: C.textMid }}>Select your legal work authorization type and upload proof.</p>
      </div>
      <div className="relative" ref={dropdownRef}>
        <label className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: C.textMid }}>
          <Briefcase className="w-3.5 h-3.5" style={{ color: C.amethyst }} />
          Work Authorization Type
        </label>
        <button
          type="button"
          onClick={onToggleDropdown}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          className={`w-full rounded-2xl px-4 py-4 flex items-center justify-between transition-colors duration-200 ${focusRing}`}
          style={{ backgroundColor: C.surface, border: `1.5px solid ${dropdownOpen ? C.amethyst : C.borderStrong}` }}
        >
          <span className="text-base font-medium" style={{ color: selectedOption ? C.textHi : C.textLo }}>
            {selectedOption ? selectedOption.label : "Select authorization type"}
          </span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 flex-shrink-0" style={{ color: C.textMid, transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
        </button>
        {dropdownOpen && (
          <div role="listbox" className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden z-30" style={{ backgroundColor: C.surfaceHi, border: `1px solid ${C.borderStrong}`, boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
            {workAuthOptions.map((opt) => {
              const OptIcon = opt.icon;
              const isSelected = workAuthType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelectType(opt.value)}
                  className={`w-full px-4 py-3.5 flex items-start gap-3 text-left transition-colors duration-150 ${focusRing}`}
                  style={{ backgroundColor: isSelected ? C.amethystDim : "transparent" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: isSelected ? C.amethyst : "rgba(255,255,255,0.06)" }}>
                    <OptIcon className="w-4 h-4" style={{ color: isSelected ? "#FFFFFF" : C.textMid }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: C.textHi }}>{opt.label}</p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: C.textLo }}>{opt.description}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: C.amethyst }} />}
                </button>
              );
            })}
          </div>
        )}
        {selectedOption && !dropdownOpen && (
          <p className="text-xs mt-1.5 ml-1" style={{ color: C.textLo }}>{selectedOption.description}</p>
        )}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: C.textMid }}>
          <FileText className="w-3.5 h-3.5" style={{ color: C.amethyst }} />
          Permit or License Document
        </label>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={onFileSelect} className="hidden" />
        {!complianceDoc ? (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            role="button"
            tabIndex={0}
            className={`w-full rounded-2xl flex flex-col items-center justify-center gap-2.5 py-9 cursor-pointer transition-all duration-200 ${focusRing}`}
            style={{ backgroundColor: isDragging ? C.emeraldDim : C.surface, border: `1.5px dashed ${isDragging ? C.emerald : C.borderStrong}` }}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-200" style={{ backgroundColor: isDragging ? C.emerald : C.amethystDim }}>
              <UploadCloud className="w-5 h-5" style={{ color: isDragging ? C.bg : C.amethyst }} />
            </div>
            <div className="text-center px-6">
              <p className="text-sm font-semibold" style={{ color: C.textHi }}>{isDragging ? "Drop file to upload" : "Drag & drop or tap to upload"}</p>
              <p className="text-xs mt-0.5" style={{ color: C.textLo }}>PDF, JPG or PNG &middot; Max 10MB</p>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-2xl p-3.5 flex items-center gap-3" style={{ backgroundColor: C.surface, border: `1.5px solid ${C.emerald}50` }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.emeraldDim }}>
              <FileText className="w-5 h-5" style={{ color: C.emerald }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: C.textHi }}>{complianceDoc.name}</p>
              <p className="text-xs" style={{ color: C.textLo }}>{formatFileSize(complianceDoc.size)}</p>
            </div>
            <button
              type="button"
              onClick={onFileRemove}
              aria-label="Remove compliance document"
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${focusRing}`}
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <X className="w-4 h-4" style={{ color: C.textMid }} />
            </button>
          </div>
        )}
        {complianceError && (
          <div className="flex items-center gap-1.5 mt-2 px-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.danger }} />
            <p className="text-xs" style={{ color: C.danger }}>{complianceError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmittingView({ progress }) {
  return (
    <div className="flex flex-col items-center text-center pt-14 px-1">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8" style={{ background: `linear-gradient(135deg, ${C.amethyst}, ${C.emerald})`, boxShadow: `0 8px 34px ${C.amethyst}45` }}>
        <Loader2 className="w-9 h-9 text-white animate-spin" />
      </div>
      <h2 className="text-lg font-bold mb-2" style={{ color: C.textHi }}>Submitting for Vetting</h2>
      <p className="text-sm mb-8" style={{ color: C.textMid, minHeight: "20px" }}>{getSubmitStatusText(progress)}</p>
      <div className="w-full">
        <div className="w-full h-3 rounded-full overflow-hidden relative" style={{ backgroundColor: C.surfaceHi }}>
          <div
            className="h-full rounded-full relative overflow-hidden"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${C.amethyst}, ${C.emerald})`, boxShadow: `0 0 12px ${C.emerald}80`, transition: "width 0.15s linear" }}
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", animation: "shimmer 1.2s infinite" }} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs font-medium" style={{ color: C.textLo }}>Processing</span>
          <span className="text-xs font-bold" style={{ color: C.textHi }}>{progress}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 w-full mt-10">
        {vettingChecklist.map((item) => {
          const done = progress >= item.threshold;
          return (
            <div key={item.threshold} className="flex items-center gap-3 text-left">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300" style={{ backgroundColor: done ? C.emerald : C.surfaceHi }}>
                {done && <Check className="w-3 h-3" style={{ color: C.bg }} />}
              </div>
              <span className="text-xs transition-colors duration-300" style={{ color: done ? C.textHi : C.textLo }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerifiedBadge({ verificationId, verificationDate, onReset, onEnterDashboard }) {
  return (
    <div className="flex flex-col items-center text-center pt-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full blur-2xl opacity-60" style={{ background: `radial-gradient(circle, ${C.emerald}, transparent 70%)`, animation: "pulseGlow 2.4s ease-in-out infinite" }} />
        <div className="w-24 h-24 rounded-full flex items-center justify-center relative" style={{ background: `linear-gradient(135deg, ${C.emerald}, #16A34A)`, boxShadow: `0 10px 40px ${C.emerald}55` }}>
          <BadgeCheck className="w-12 h-12 text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-extrabold mb-1.5" style={{ color: C.textHi }}>You're Verified!</h2>
      <p className="text-sm mb-8 max-w-xs" style={{ color: C.textMid }}>
        Your talent profile has passed compliance vetting and is now live on Vibe Pass.
      </p>
      <div
        className="w-full rounded-3xl p-6 relative overflow-hidden mb-6"
        style={{
          border: "1px solid transparent",
          backgroundImage: `linear-gradient(160deg, ${C.surfaceHi}, ${C.surface}), linear-gradient(135deg, ${C.amethyst}, ${C.emerald})`,
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.amethyst}, ${C.emerald})` }}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold tracking-wide" style={{ color: C.textHi }}>VIBE PASS</span>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: C.emeraldDim, color: C.emerald }}>ACTIVE</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: C.amethyst }}>Verified Professional Talent</p>
        <p className="text-xs mb-5" style={{ color: C.textMid }}>Identity, Emirates ID, and work authorization confirmed under UAE compliance standards.</p>
        <div className="h-px w-full mb-5" style={{ backgroundColor: C.borderFaint }} />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: C.textLo }}>Verification ID</p>
            <p className="text-sm font-mono font-bold" style={{ color: C.textHi }}>{verificationId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: C.textLo }}>Issued</p>
            <p className="text-sm font-semibold" style={{ color: C.textHi }}>{verificationDate}</p>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col gap-2.5 mb-2">
        {badgeChecklist.map((item) => (
          <div key={item} className="flex items-center gap-2.5 text-left px-1">
            <Check className="w-4 h-4 flex-shrink-0" style={{ color: C.emerald }} />
            <span className="text-xs" style={{ color: C.textMid }}>{item}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onEnterDashboard}
        className={`w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 mt-6 transition-all duration-200 active:scale-95 ${focusRing}`}
        style={{ background: C.emerald, color: "#052E16", boxShadow: `0 4px 20px ${C.emerald}55` }}
      >
        <Sparkles className="w-4 h-4" />
        Enter Talent Pass
      </button>
      <button
        type="button"
        onClick={onReset}
        className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 mt-2.5 transition-all duration-200 active:scale-95 ${focusRing}`}
        style={{ backgroundColor: C.surfaceHi, color: C.textHi, border: `1px solid ${C.borderFaint}` }}
      >
        <RotateCcw className="w-4 h-4" />
        Run Verification Again
      </button>
    </div>
  );
}

/* Full-screen replayable overlay hosting the verification wizard */
function OnboardingOverlay(props) {
  const {
    currentStep, uaePassLinked, uaePassLoading, onLink,
    emiratesDigits, onEmiratesChange, passportFile, onPassportPick, onPassportRemove, passportInputRef, passportError,
    workAuthType, onSelectType, dropdownOpen, onToggleDropdown, complianceDoc, onFileSelect, onFileRemove,
    isDragging, onDragOver, onDragLeave, onDrop, fileInputRef, complianceError, dropdownRef,
    submissionPhase, submitProgress, verificationId, verificationDate,
    canProceed, onBack, onNext, onSubmitForVetting, onReset, onClose, onEnterDashboard,
  } = props;

  const isFormPhase = submissionPhase === "idle";
  const locked = submissionPhase === "submitting";

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: C.bg, zIndex: 1500, animation: "vpFadeIn 0.2s ease" }}>
      <header className="sticky top-0 z-20 px-5 pt-5 pb-4" style={{ backgroundColor: "rgba(10,10,12,0.92)", borderBottom: `1px solid ${C.borderFaint}`, backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.amethyst}, ${C.emerald})` }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold tracking-wide leading-none" style={{ color: C.textHi }}>VIBE PASS</p>
            <p className="text-xs leading-none mt-1" style={{ color: C.textLo }}>Talent Verification</p>
          </div>
          <button
            type="button"
            onClick={() => !locked && onClose()}
            disabled={locked}
            aria-label="Close verification"
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 disabled:opacity-30 ${focusRing}`}
            style={{ backgroundColor: C.surfaceHi, border: `1px solid ${C.borderFaint}` }}
          >
            <X className="w-4 h-4" style={{ color: C.textMid }} />
          </button>
        </div>
        {isFormPhase && <Stepper currentStep={currentStep} />}
      </header>
      <main className="flex-1 overflow-y-auto vp-noscroll px-5 pt-6 pb-36">
        {submissionPhase === "idle" && currentStep === 1 && (
          <StepIdentity uaePassLinked={uaePassLinked} uaePassLoading={uaePassLoading} onLink={onLink} />
        )}
        {submissionPhase === "idle" && currentStep === 2 && (
          <StepDocuments
            emiratesDigits={emiratesDigits}
            onEmiratesChange={onEmiratesChange}
            passportFile={passportFile}
            onPassportPick={onPassportPick}
            onPassportRemove={onPassportRemove}
            passportInputRef={passportInputRef}
            passportError={passportError}
          />
        )}
        {submissionPhase === "idle" && currentStep === 3 && (
          <StepAuthorization
            workAuthType={workAuthType}
            onSelectType={onSelectType}
            dropdownOpen={dropdownOpen}
            onToggleDropdown={onToggleDropdown}
            complianceDoc={complianceDoc}
            onFileSelect={onFileSelect}
            onFileRemove={onFileRemove}
            isDragging={isDragging}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            fileInputRef={fileInputRef}
            complianceError={complianceError}
            dropdownRef={dropdownRef}
          />
        )}
        {submissionPhase === "submitting" && <SubmittingView progress={submitProgress} />}
        {submissionPhase === "verified" && (
          <VerifiedBadge verificationId={verificationId} verificationDate={verificationDate} onReset={onReset} onEnterDashboard={onEnterDashboard} />
        )}
      </main>
      {isFormPhase && (
        <footer className="fixed bottom-0 left-0 right-0 z-20 flex justify-center" style={{ backgroundColor: "rgba(10,10,12,0.95)", borderTop: `1px solid ${C.borderFaint}`, backdropFilter: "blur(10px)" }}>
          <div className="w-full max-w-md px-5 pt-4 pb-6 flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-95 ${focusRing}`}
                style={{ backgroundColor: C.surface, border: `1px solid ${C.borderStrong}` }}
              >
                <ChevronLeft className="w-5 h-5" style={{ color: C.textMid }} />
              </button>
            )}
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={onNext}
                disabled={!canProceed}
                className={`flex-1 h-14 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed ${focusRing}`}
                style={{
                  background: canProceed ? `linear-gradient(135deg, ${C.amethyst}, #7C3AED)` : C.surface,
                  color: canProceed ? "#FFFFFF" : C.textLo,
                  boxShadow: canProceed ? `0 4px 20px ${C.amethyst}50` : "none",
                }}
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmitForVetting}
                disabled={!canProceed}
                className={`flex-1 h-14 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed ${focusRing}`}
                style={{
                  background: canProceed ? `linear-gradient(135deg, ${C.emerald}, #16A34A)` : C.surface,
                  color: canProceed ? C.bg : C.textLo,
                  boxShadow: canProceed ? `0 4px 20px ${C.emerald}55` : "none",
                }}
              >
                <ShieldCheck className="w-4 h-4" />
                Submit for Vetting
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

/* ============================================================
   SHARED CONTROL - toggle switch (EPK visibility, mentorship)
   ============================================================ */
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      /* p-0 matters: a button carries user-agent padding, and the knob below is
         positioned from its containing block, so that padding would offset the
         travel. */
      className="relative h-6 w-11 shrink-0 rounded-full p-0 transition-colors duration-200"
      style={{ background: checked ? C.emerald : C.line }}
      role="switch"
      aria-checked={checked}
    >
      <span
        /* left-0 anchors the knob to the track's left edge. Without it the
           element resolves to its static position, which a button's centred
           text alignment and padding both shift — so translateX started from
           the wrong origin and the knob sat off-centre, most visibly once
           toggled on. 44px track - 20px knob - 2px inset = 22px of travel. */
        className="absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

/* ============================================================
   HOME / DASHBOARD
   ============================================================ */
function StatChip({ label, value, icon }) {
  return (
    <div className="shrink-0 rounded-2xl border px-3.5 py-2.5" style={{ borderColor: C.line, background: C.surface }}>
      <p className="flex items-center gap-1 text-sm font-bold" style={{ color: C.textHi }}>
        {icon}
        {value}
      </p>
      <p className="mt-0.5 whitespace-nowrap text-xs" style={{ color: C.textLo }}>{label}</p>
    </div>
  );
}

function MilestoneChip({ icon: Icon, label, unlocked, value, max, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="flex flex-1 flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 transition-transform active:scale-95"
      style={{ borderColor: unlocked ? C.emerald + "55" : C.line, background: unlocked ? C.emeraldDim : C.surface }}
    >
      <RadialProgress value={value} max={max} size={44} color={unlocked ? C.emerald : C.amethyst}>
        {unlocked ? <BadgeCheck size={17} color={C.emerald} /> : <Icon size={15} color={C.textMid} />}
      </RadialProgress>
      <span className="text-center text-xs font-semibold leading-tight" style={{ color: C.textHi }}>{label}</span>
      <span className="text-xs" style={{ color: unlocked ? C.emerald : C.textLo }}>
        {unlocked ? "Unlocked" : `${value}/${max}`}
      </span>
    </button>
  );
}

function TalentDividendCard({ dividend, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-3xl border p-4 text-left transition-transform active:scale-95"
      style={{ borderColor: C.line, background: `linear-gradient(135deg, ${C.surfaceHi}, ${C.surface})` }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: C.amethystDim }}>
          <Zap size={15} color={C.amethyst} />
        </div>
        <p className="flex-1 text-xs font-bold uppercase tracking-wide" style={{ color: C.amethyst }}>Kickback Fuel Bonus</p>
        <ChevronRight size={16} color={C.textLo} />
      </div>
      <p className="text-sm" style={{ color: C.textHi }}>
        <span className="font-bold">{dividend.event}</span> beat the venue's average revenue by{" "}
        <span className="font-bold" style={{ color: C.emerald }}>+{dividend.pct}%</span>
      </p>
      <p className="mt-1 text-xs" style={{ color: C.textMid }}>
        Dividend processed automatically from the venue's payout - nothing for you to file.
      </p>
      <p className="mt-2.5 text-xl font-bold" style={{ color: C.emerald }}>+{fmtAEDRound(dividend.amount)}</p>
    </button>
  );
}

function RestRewardCard({ weeks, target, onClaim }) {
  const ready = weeks >= target;
  const remaining = Math.max(0, target - weeks);
  return (
    <div
      className="w-full rounded-3xl border p-4"
      style={{ borderColor: ready ? C.emerald + "55" : C.line, background: ready ? "rgba(34,197,94,0.07)" : C.surface }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: C.emeraldDim }}>
          <Moon size={15} color={C.emerald} />
        </div>
        <p className="flex-1 text-xs font-bold uppercase tracking-wide" style={{ color: C.emerald }}>Blackout Safety Net</p>
        <Flame size={14} color={ready ? C.emerald : C.textLo} />
      </div>
      <p className="text-sm font-semibold" style={{ color: C.textHi }}>
        {ready ? "Rest Reward unlocked" : `${weeks} of ${target} consecutive weeks worked`}
      </p>
      <div className="mt-2.5"><ProgressBar value={weeks} max={target} color={C.emerald} /></div>
      <p className="mt-2 text-xs" style={{ color: C.textMid }}>
        {ready
          ? "You've earned a paid weekend off without losing momentum. Claim your stipend whenever you're ready."
          : `${remaining} more consecutive week${remaining === 1 ? "" : "s"} unlocks a cash stipend for taking a weekend off.`}
      </p>
      {ready && (
        <button
          onClick={onClaim}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-transform active:scale-95"
          style={{ background: C.emerald, color: "#052E16" }}
        >
          <PartyPopper size={15} />
          Claim AED 400 Safety Bonus
        </button>
      )}
    </div>
  );
}

function VibeCreditsWidget({ credits, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-3xl border p-4 text-left transition-transform active:scale-95"
      style={{ borderColor: C.line, background: C.surface }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `linear-gradient(135deg, ${C.gold}, #C9871E)` }}>
        <Gift size={19} color="#1A1200" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color: C.textHi }}>{credits.toLocaleString()} Vibe Credits</p>
        <p className="text-xs" style={{ color: C.textMid }}>Redeem for gear, studio time &amp; marketing</p>
      </div>
      <ChevronRight size={16} color={C.textLo} />
    </button>
  );
}

function HomeView({
  distinctVenues, freeAgentUnlocked, vibePioneerStreak, vibePioneerUnlocked, tenureMonths, mentorshipUnlocked,
  latestDividend, weeksActiveStreak, onClaimRestReward, vibeCredits, onOpenMilestones, onOpenWallet, onOpenCredits,
}) {
  return (
    <div className="px-4 pt-2 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold"
            style={{ backgroundImage: `linear-gradient(135deg, ${C.emerald}, ${C.amethyst})`, color: "#0A0A0C" }}
          >
            {TALENT.avatarInitial}
          </div>
          <div>
            <p className="text-lg font-extrabold leading-tight" style={{ color: C.textHi }}>{TALENT.name}</p>
            <p className="text-xs" style={{ color: C.textMid }}>{TALENT.craft}</p>
          </div>
        </div>
        {freeAgentUnlocked && (
          <Pill color={C.gold} bg="rgba(245,185,66,0.12)" border="rgba(245,185,66,0.4)" icon={<Award size={12} color={C.gold} />}>
            Free Agent
          </Pill>
        )}
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 vp-noscroll">
        <StatChip label="Total Gigs" value={TALENT.totalGigs} />
        <StatChip label="Avg Rating" value={TALENT.rating.toFixed(1)} icon={<Star size={11} color={C.gold} fill={C.gold} />} />
        <StatChip label="Venues Worked" value={distinctVenues} />
        <StatChip label="On Vibe Pass" value={`${tenureMonths} mo`} />
      </div>

      <div className="mt-5">
        <SectionTitle right={<button onClick={onOpenWallet} className="text-xs font-semibold" style={{ color: C.emerald }}>Wallet</button>}>
          Talent Dividend
        </SectionTitle>
        <TalentDividendCard dividend={latestDividend} onOpen={onOpenWallet} />
      </div>

      <div className="mt-5">
        <SectionTitle right={<button onClick={onOpenMilestones} className="text-xs font-semibold" style={{ color: C.emerald }}>Details</button>}>
          Your Milestones
        </SectionTitle>
        <div className="flex gap-2.5">
          <MilestoneChip icon={Award} label="Independent Agent" unlocked={freeAgentUnlocked} value={distinctVenues} max={MILESTONE_TARGETS.independentAgentVenues} onOpen={onOpenMilestones} />
          <MilestoneChip icon={Crown} label="Vibe Pioneer" unlocked={vibePioneerUnlocked} value={vibePioneerStreak} max={MILESTONE_TARGETS.vibePioneerStreak} onOpen={onOpenMilestones} />
          <MilestoneChip icon={UserPlus} label="Mentorship" unlocked={mentorshipUnlocked} value={tenureMonths} max={MILESTONE_TARGETS.mentorshipMonths} onOpen={onOpenMilestones} />
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle>Blackout Safety Net</SectionTitle>
        <RestRewardCard weeks={weeksActiveStreak} target={MILESTONE_TARGETS.restRewardWeeks} onClaim={onClaimRestReward} />
      </div>

      <div className="mt-5">
        <SectionTitle>Unused Vibe Credits</SectionTitle>
        <VibeCreditsWidget credits={vibeCredits} onOpen={onOpenCredits} />
      </div>

      <p className="mt-6 mb-1 text-center text-xs leading-relaxed" style={{ color: C.textLo }}>
        Every incentive here is funded by Vibe Pass or the venue - never deducted from your booking fee.
      </p>
    </div>
  );
}

/* ============================================================
   MILESTONE DETAIL SHEET
   ============================================================ */
function MilestoneDetailSheet({
  onClose, distinctVenues, freeAgentUnlocked,
  vibePioneerStreak, vibePioneerUnlocked, communityVote, onSelectVote,
  headlineSlots, claimedSlotIds, onClaimSlot,
  tenureMonths, mentorshipUnlocked, mentees, mentorshipEnabled, onToggleMentorship,
}) {
  const iaTarget = MILESTONE_TARGETS.independentAgentVenues;
  const vpTarget = MILESTONE_TARGETS.vibePioneerStreak;
  const mlTarget = MILESTONE_TARGETS.mentorshipMonths;
  const boostedRate = Math.round(BASE_RATE_AED * (1 + FREE_AGENT_RATE_BOOST_PCT / 100));
  const totalMentorBonus = mentees.reduce((sum, m) => sum + m.bonus, 0);

  return (
    <div className="absolute inset-0 flex flex-col justify-end" style={{ zIndex: 1300 }}>
      <button
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }}
        aria-label="Close milestones"
      />
      <div
        className="relative z-10 flex flex-col overflow-hidden rounded-t-3xl border-t"
        style={{ background: C.surface, borderColor: C.line, maxHeight: "90%", animation: "vpSlideUp 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      >
        <div className="overflow-y-auto vp-noscroll px-5 pt-3 pb-8">
          <div className="flex justify-center pb-2">
            <span className="h-1 w-10 rounded-full" style={{ background: C.borderStrong }} />
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: C.textHi }}>Your Milestones</h2>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90" style={{ background: C.surfaceHi, border: `1px solid ${C.line}` }}>
              <X size={16} color={C.textHi} />
            </button>
          </div>
          <p className="mt-1 text-xs" style={{ color: C.textMid }}>
            Built around your growing reputation and independence - not hours clocked for one club.
          </p>

          <div className="mt-5 rounded-3xl border p-4" style={{ borderColor: freeAgentUnlocked ? C.gold + "55" : C.line, background: freeAgentUnlocked ? "rgba(245,185,66,0.06)" : C.surfaceHi }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(245,185,66,0.14)" }}>
                <Award size={16} color={C.gold} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: C.textHi }}>Independent Agent</p>
                <p className="text-xs" style={{ color: C.textMid }}>Worked {distinctVenues} of {iaTarget}+ distinct venues</p>
              </div>
              {freeAgentUnlocked && <BadgeCheck size={18} color={C.gold} className="shrink-0" />}
            </div>
            <div className="mt-3"><ProgressBar value={distinctVenues} max={iaTarget} color={C.gold} /></div>
            {freeAgentUnlocked ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} color={C.gold} />
                  <span className="text-xs" style={{ color: C.textMid }}>Recommended rate boosted</span>
                </div>
                <span className="shrink-0 text-xs font-bold" style={{ color: C.gold }}>+{FREE_AGENT_RATE_BOOST_PCT}% &rarr; {fmtAEDRound(boostedRate)}/set</span>
              </div>
            ) : (
              <p className="mt-2.5 text-xs" style={{ color: C.textLo }}>
                {iaTarget - distinctVenues} more distinct venue{iaTarget - distinctVenues === 1 ? "" : "s"} unlocks your Free Agent badge and a rate boost.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-3xl border p-4" style={{ borderColor: vibePioneerUnlocked ? C.amethyst + "55" : C.line, background: vibePioneerUnlocked ? C.amethystDim : C.surfaceHi }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: C.amethystDim }}>
                <Crown size={16} color={C.amethyst} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: C.textHi }}>Vibe Pioneer</p>
                <p className="text-xs" style={{ color: C.textMid }}>{vibePioneerStreak} of {vpTarget} consecutive 4.8&#9733;+ gigs</p>
              </div>
              {vibePioneerUnlocked && <BadgeCheck size={18} color={C.amethyst} className="shrink-0" />}
            </div>
            <div className="mt-3"><ProgressBar value={vibePioneerStreak} max={vpTarget} color={C.amethyst} /></div>
            {!vibePioneerUnlocked && (
              <p className="mt-2.5 text-xs" style={{ color: C.textLo }}>
                {vpTarget - vibePioneerStreak} more consecutive high-rated gig{vpTarget - vibePioneerStreak === 1 ? "" : "s"} unlocks community voting power and first dibs on headline slots.
              </p>
            )}

            <div className="mt-3.5 rounded-2xl p-3.5" style={{ background: C.surface, border: `1px solid ${C.line}`, opacity: vibePioneerUnlocked ? 1 : 0.55 }}>
              <div className="mb-2 flex items-center gap-2">
                <ThumbsUp size={13} color={C.amethyst} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: C.amethyst }}>Community Voting Power</span>
                {!vibePioneerUnlocked && <Lock size={11} color={C.textLo} className="ml-auto" />}
              </div>
              <p className="mb-2.5 text-xs" style={{ color: C.textHi }}>{communityVote.question}</p>
              <div className="flex flex-col gap-1.5">
                {communityVote.options.map((opt) => {
                  const selected = communityVote.selectedId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!vibePioneerUnlocked}
                      onClick={() => onSelectVote(opt.id)}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-transform active:scale-95 disabled:cursor-not-allowed"
                      style={{ background: selected ? C.amethystDim : C.surfaceHi, border: `1px solid ${selected ? C.amethyst : C.line}`, color: C.textHi }}
                    >
                      {opt.label}
                      {selected && <Check size={13} color={C.amethyst} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 rounded-2xl p-3.5" style={{ background: C.surface, border: `1px solid ${C.line}`, opacity: vibePioneerUnlocked ? 1 : 0.55 }}>
              <div className="mb-2 flex items-center gap-2">
                <Crown size={13} color={C.amethyst} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: C.amethyst }}>First Dibs - Headline Slots</span>
                {!vibePioneerUnlocked && <Lock size={11} color={C.textLo} className="ml-auto" />}
              </div>
              <div className="flex flex-col gap-2">
                {headlineSlots.map((slot) => {
                  const claimed = claimedSlotIds.includes(slot.id);
                  return (
                    <div key={slot.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: C.surfaceHi }}>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold" style={{ color: C.textHi }}>{slot.event}</p>
                        <p className="truncate text-xs" style={{ color: C.textLo }}>{slot.venue} - {slot.date}</p>
                      </div>
                      <button
                        type="button"
                        disabled={!vibePioneerUnlocked || claimed}
                        onClick={() => onClaimSlot(slot.id)}
                        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 disabled:cursor-not-allowed"
                        style={{ background: claimed ? "transparent" : C.amethyst, color: claimed ? C.emerald : "#FFFFFF", border: claimed ? `1px solid ${C.emerald}` : "none" }}
                      >
                        {claimed ? "Claimed" : fmtAEDRound(slot.rate)}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border p-4" style={{ borderColor: mentorshipUnlocked ? C.emerald + "55" : C.line, background: mentorshipUnlocked ? C.emeraldDim : C.surfaceHi }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: C.emeraldDim }}>
                <UserPlus size={16} color={C.emerald} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: C.textHi }}>Mentorship / Legacy</p>
                <p className="text-xs" style={{ color: C.textMid }}>{tenureMonths} of {mlTarget} months on Vibe Pass</p>
              </div>
              {mentorshipUnlocked && <BadgeCheck size={18} color={C.emerald} className="shrink-0" />}
            </div>
            <div className="mt-3"><ProgressBar value={tenureMonths} max={mlTarget} color={C.emerald} /></div>
            {mentorshipUnlocked ? (
              <Fragment>
                <div className="mt-3.5 flex items-center justify-between gap-3 rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: C.textHi }}>Open to mentee requests</p>
                    <p className="text-xs" style={{ color: C.textLo }}>Bonus is platform-funded, never taken from a mentee's cut.</p>
                  </div>
                  <ToggleSwitch checked={mentorshipEnabled} onChange={onToggleMentorship} />
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {mentees.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold" style={{ color: C.textHi }}>{m.name}</p>
                        <p className="truncate text-xs" style={{ color: C.textLo }}>{m.craft} - joined {m.joined}</p>
                      </div>
                      <span className="shrink-0 text-xs font-bold" style={{ color: C.emerald }}>+{fmtAEDRound(m.bonus)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-center text-xs" style={{ color: C.textLo }}>
                  Total mentor bonus this month: <span className="font-bold" style={{ color: C.emerald }}>{fmtAEDRound(totalMentorBonus)}</span>
                </p>
              </Fragment>
            ) : (
              <p className="mt-2.5 text-xs" style={{ color: C.textLo }}>
                {mlTarget - tenureMonths} more month{mlTarget - tenureMonths === 1 ? "" : "s"} unlocks paid mentorship of newer talent.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SHARED - empty state
   ============================================================ */
function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border px-6 py-8 text-center" style={{ borderColor: C.line, background: C.surface }}>
      <Icon size={22} color={C.textLo} />
      <p className="text-sm font-semibold" style={{ color: C.textHi }}>{title}</p>
      <p className="text-xs" style={{ color: C.textMid }}>{desc}</p>
    </div>
  );
}

/* ============================================================
   BOOKINGS - gig requests inbox + upcoming schedule
   ============================================================ */
function GigRequestCard({ req, onAccept, onDecline }) {
  return (
    <div className="rounded-3xl border p-4" style={{ borderColor: C.amethyst + "40", background: C.surface }}>
      <div className="flex items-center justify-between">
        <Pill color={C.amethyst} bg={C.amethystDim} icon={<Sparkles size={11} color={C.amethyst} />}>New Request</Pill>
        <span className="text-sm font-bold" style={{ color: C.emerald }}>{fmtAEDRound(req.rate)}</span>
      </div>
      <p className="mt-2.5 text-base font-bold leading-snug" style={{ color: C.textHi }}>{req.event}</p>
      {req.roleNeeded && (
        <div className="mt-1.5">
          <Pill color={C.textMid} bg={C.surfaceHi} icon={<Users size={11} color={C.textMid} />}>
            {req.roleNeeded} needed
          </Pill>
        </div>
      )}
      <div className="mt-1.5 flex flex-col gap-1 text-xs" style={{ color: C.textMid }}>
        <span className="flex items-center gap-1.5"><MapPin size={12} color={C.amethyst} />{req.venue}</span>
        <span className="flex items-center gap-1.5"><CalendarDays size={12} color={C.amethyst} />{req.date}</span>
        <span className="flex items-center gap-1.5"><Clock size={12} color={C.amethyst} />{req.time}</span>
      </div>
      {req.note && <p className="mt-2 text-xs italic" style={{ color: C.textLo }}>&ldquo;{req.note}&rdquo;</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onDecline(req.id)}
          className="flex h-11 flex-1 items-center justify-center rounded-full text-sm font-semibold transition-transform active:scale-95"
          style={{ background: C.surfaceHi, border: `1px solid ${C.line}`, color: C.textMid }}
        >
          Decline
        </button>
        <button
          onClick={() => onAccept(req.id)}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-transform active:scale-95"
          style={{ background: C.emerald, color: "#052E16" }}
        >
          <Check size={15} />
          Accept
        </button>
      </div>
    </div>
  );
}

function UpcomingBookingCard({ booking }) {
  return (
    <div className="rounded-3xl border p-4" style={{ borderColor: C.line, background: C.surface }}>
      <div className="flex items-center justify-between">
        <Pill color={C.emerald} bg={C.emeraldDim} icon={<BadgeCheck size={11} color={C.emerald} />}>Confirmed</Pill>
        <span className="text-sm font-bold" style={{ color: C.emerald }}>{fmtAEDRound(booking.payout)}</span>
      </div>
      <p className="mt-2.5 text-base font-bold leading-snug" style={{ color: C.textHi }}>{booking.event}</p>
      <div className="mt-1.5 flex flex-col gap-1 text-xs" style={{ color: C.textMid }}>
        <span className="flex items-center gap-1.5"><MapPin size={12} color={C.emerald} />{booking.venue}</span>
        <span className="flex items-center gap-1.5"><CalendarDays size={12} color={C.emerald} />{booking.date}</span>
        <span className="flex items-center gap-1.5"><Clock size={12} color={C.emerald} />{booking.time}</span>
      </div>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${booking.lat},${booking.lng}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-transform active:scale-95"
        style={{ background: C.surfaceHi, border: `1px solid ${C.line}`, color: C.textHi }}
      >
        <Navigation size={13} color={C.emerald} />
        Get Directions
      </a>
    </div>
  );
}

/* Talent-side directory search: venues (derived from ALL_EVENTS),
   other artists (TALENT_ROSTER), and promoters (PROMOTER_DIRECTORY) -
   the three real pools already built in Nav-4/Nav-5, searched with
   the same join-then-includes pattern used everywhere else in this
   app (landing page PreviewGrid, Fan Pass SearchView). Grouped by
   kind rather than interleaved into one list, since a venue, a
   promoter, and a fellow artist aren't directly comparable results to
   rank against each other. */
function TalentDirectorySearch() {
  const [query, setQuery] = useState("");

  const venues = useMemo(() => {
    const seen = new Set();
    const list = [];
    ALL_EVENTS.forEach((e) => {
      if (!seen.has(e.venue)) {
        seen.add(e.venue);
        list.push({ id: `venue-${e.venue}`, name: e.venue, zone: e.zone, eventTitle: e.title });
      }
    });
    return list;
  }, []);

  const { promoterMatches, talentMatches, venueMatches } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { promoterMatches: [], talentMatches: [], venueMatches: [] };
    const pm = PROMOTER_DIRECTORY.filter((p) => {
      const hay = [p.businessName, p.focus, p.blurb].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    const tm = TALENT_ROSTER.filter((t) => {
      const hay = [t.name, t.specialty, t.category, t.basedIn].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    const vm = venues.filter((v) => {
      const hay = [v.name, v.zone, v.eventTitle].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    return { promoterMatches: pm, talentMatches: tm, venueMatches: vm };
  }, [query, venues]);

  const hasQuery = query.trim().length > 0;
  const totalResults = promoterMatches.length + talentMatches.length + venueMatches.length;

  return (
    <div className="mt-5">
      <SectionTitle>Search Venues, Artists & Promoters</SectionTitle>
      <div
        className="flex items-center gap-2 rounded-full border p-1.5"
        style={{ borderColor: C.line, background: C.surface }}
      >
        <Search size={16} color={C.textLo} className="ml-2 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search venues, artists, or promoters..."
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: C.textHi }}
        />
        {hasQuery ? (
          <button
            onClick={() => setQuery("")}
            className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{ background: C.surfaceHi }}
            aria-label="Clear search"
          >
            <X size={12} color={C.textMid} />
          </button>
        ) : null}
      </div>

      {!hasQuery ? (
        <p className="mt-2.5 text-xs" style={{ color: C.textLo }}>
          Find venues to pitch, promoters who might book you, or other artists to collaborate with.
        </p>
      ) : totalResults === 0 ? (
        <div
          className="mt-3 flex flex-col items-center gap-2 rounded-3xl border px-6 py-8 text-center"
          style={{ borderColor: C.line, background: C.surface }}
        >
          <Compass size={22} color={C.textLo} />
          <p className="text-sm font-semibold" style={{ color: C.textHi }}>
            No results for &quot;{query}&quot;
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {promoterMatches.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
                Promoters
              </p>
              <div className="flex flex-col gap-2">
                {promoterMatches.map((p) => (
                  <div key={p.id} className="rounded-2xl border p-3" style={{ borderColor: C.line, background: C.surface }}>
                    <p className="text-sm font-bold" style={{ color: C.textHi }}>{p.businessName}</p>
                    <p className="mt-0.5 text-xs" style={{ color: C.emerald }}>{p.focus}</p>
                    <p className="mt-1 text-xs" style={{ color: C.textMid }}>{p.blurb}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {talentMatches.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
                Other Artists
              </p>
              <div className="flex flex-col gap-2">
                {talentMatches.map((t) => (
                  <div key={t.id} className="rounded-2xl border p-3" style={{ borderColor: C.line, background: C.surface }}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ backgroundImage: `linear-gradient(135deg, ${C.emerald}, ${C.amethyst})`, color: "#0A0A0C" }}
                      >
                        {t.avatarInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold" style={{ color: C.textHi }}>{t.name}</p>
                        <p className="truncate text-xs" style={{ color: C.textMid }}>
                          {t.specialty} &middot; {t.basedIn}
                        </p>
                      </div>
                      <StarRating value={t.rating} />
                    </div>
                    <p className="mt-2 text-xs" style={{ color: C.textLo }}>{t.bio}</p>
                    <p className="mt-1.5 text-xs font-semibold" style={{ color: C.emerald }}>
                      From {fmtAED(t.ratePerEvent)}/event
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {venueMatches.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
                Venues
              </p>
              <div className="flex flex-col gap-2">
                {venueMatches.map((v) => (
                  <div key={v.id} className="rounded-2xl border p-3" style={{ borderColor: C.line, background: C.surface }}>
                    <p className="text-sm font-bold" style={{ color: C.textHi }}>{v.name}</p>
                    <p className="mt-0.5 text-xs" style={{ color: C.textMid }}>{v.zone}</p>
                    <p className="mt-1 text-xs" style={{ color: C.textLo }}>Hosting: {v.eventTitle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BookingsView({ requests, bookings, onAccept, onDecline }) {
  return (
    <div className="px-4 pt-2 pb-2">
      <h1 className="text-xl font-extrabold" style={{ color: C.textHi }}>Bookings</h1>
      <p className="mt-0.5 text-xs" style={{ color: C.textMid }}>Gig requests come straight from verified venues and promoters.</p>

      <TalentDirectorySearch />

      <div className="mt-5">
        <SectionTitle right={requests.length > 0 ? <Pill color={C.amethyst} bg={C.amethystDim}>{requests.length}</Pill> : null}>
          Gig Requests
        </SectionTitle>
        {requests.length === 0 ? (
          <EmptyState icon={Sparkles} title="No pending requests" desc="New gig offers from venues will land here." />
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <GigRequestCard key={r.id} req={r} onAccept={onAccept} onDecline={onDecline} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <SectionTitle>Upcoming Bookings</SectionTitle>
        {bookings.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nothing booked yet" desc="Accept a gig request above to see it on your schedule." />
        ) : (
          <div className="flex flex-col gap-3">
            {bookings.map((b) => (
              <UpcomingBookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PORTFOLIO - digital press kit + Proof of Performance cards
   (the signature "living portfolio, not a timesheet" moment)
   ============================================================ */
function EpkEditor({ epk, onChangeField, onToggleGenre, onSave, freeAgentUnlocked }) {
  return (
    <div className="rounded-3xl border p-4" style={{ borderColor: C.line, background: C.surface }}>
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
          style={{ backgroundImage: `linear-gradient(135deg, ${C.emerald}, ${C.amethyst})`, color: "#0A0A0C" }}
        >
          {TALENT.avatarInitial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold" style={{ color: C.textHi }}>{TALENT.name}</p>
          <p className="truncate text-xs" style={{ color: C.textMid }}>Digital press kit - shown to promoters</p>
        </div>
        <StarRating value={TALENT.rating} />
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.textMid }}>Craft</label>
        <div className="flex flex-wrap gap-1.5">
          {CRAFT_OPTIONS.map((c) => {
            const sel = epk.craft === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChangeField("craft", c)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                style={sel ? { background: C.emerald, color: "#052E16" } : { background: C.surfaceHi, color: C.textMid, border: `1px solid ${C.line}` }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.textMid }}>Bio</label>
        <textarea
          value={epk.bio}
          onChange={(e) => onChangeField("bio", e.target.value)}
          rows={3}
          className={`w-full resize-none rounded-2xl px-3.5 py-3 text-sm outline-none ${focusRing}`}
          style={{ background: C.surfaceHi, border: `1px solid ${C.line}`, color: C.textHi }}
        />
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.textMid }}>Genres</label>
        <div className="flex flex-wrap gap-1.5">
          {GENRE_OPTIONS.map((g) => {
            const sel = epk.genres.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => onToggleGenre(g)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                style={sel ? { background: C.amethyst, color: "#FFFFFF" } : { background: C.surfaceHi, color: C.textMid, border: `1px solid ${C.line}` }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.textMid }}>Rate Range</label>
          <input
            value={epk.rateRange}
            onChange={(e) => onChangeField("rateRange", e.target.value)}
            className={`w-full rounded-2xl px-3.5 py-3 text-sm outline-none ${focusRing}`}
            style={{ background: C.surfaceHi, border: `1px solid ${C.line}`, color: C.textHi }}
          />
          {freeAgentUnlocked && <p className="mt-1 text-xs font-semibold" style={{ color: C.gold }}>Free Agent boost applied (+{FREE_AGENT_RATE_BOOST_PCT}%)</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: C.textMid }}>Visible to Promoters</label>
          <div className="flex items-center rounded-2xl px-3.5" style={{ height: 46, background: C.surfaceHi, border: `1px solid ${C.line}` }}>
            <ToggleSwitch checked={epk.visible} onChange={(v) => onChangeField("visible", v)} />
            <span className="ml-2.5 text-xs font-semibold" style={{ color: epk.visible ? C.emerald : C.textLo }}>
              {epk.visible ? "Visible" : "Hidden"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 rounded-2xl px-3.5 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.line}` }}>
          <Link2 size={14} color={C.amethyst} />
          <input
            value={epk.instagram}
            onChange={(e) => onChangeField("instagram", e.target.value)}
            placeholder="Instagram handle"
            className={`flex-1 bg-transparent text-sm outline-none ${focusRing}`}
            style={{ color: C.textHi }}
          />
        </div>
        <div className="flex items-center gap-2 rounded-2xl px-3.5 py-3" style={{ background: C.surfaceHi, border: `1px solid ${C.line}` }}>
          <Mic2 size={14} color={C.amethyst} />
          <input
            value={epk.soundcloud}
            onChange={(e) => onChangeField("soundcloud", e.target.value)}
            placeholder="SoundCloud link"
            className={`flex-1 bg-transparent text-sm outline-none ${focusRing}`}
            style={{ color: C.textHi }}
          />
        </div>
      </div>

      <button
        onClick={onSave}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-transform active:scale-95"
        style={{ background: C.emerald, color: "#052E16" }}
      >
        <Check size={16} />
        Save Changes
      </button>
    </div>
  );
}

function PortfolioCard({ card, onShare, hideActions }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        border: "1px solid transparent",
        backgroundImage: `linear-gradient(160deg, ${C.surfaceHi}, ${C.surface}), linear-gradient(135deg, ${C.amethyst}, ${C.emerald})`,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      <div className="relative h-36 w-full overflow-hidden">
        <CoverImage src={card.img} alt={card.event} accent={card.accent} />
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to top, rgba(10,10,12,0.92), rgba(10,10,12,0.1) 60%)" }} />
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full px-2 py-1" style={{ background: "rgba(10,10,12,0.75)" }}>
          <Sparkles size={10} color={C.gold} />
          <span className="font-bold uppercase tracking-wide" style={{ color: C.gold, fontSize: 9 }}>Proof of Performance</span>
        </div>
        <div className="absolute bottom-2.5 left-3.5 right-3.5">
          <p className="text-sm font-bold leading-tight" style={{ color: C.textHi }}>{card.event}</p>
          <p className="text-xs" style={{ color: C.textMid }}>{card.venue}</p>
        </div>
      </div>
      {card.awaitingRecap ? (
        /* A gig that has just finished has no crowd count, rating or top track
        yet — those arrive with the venue's recap. Saying so is more honest than
        rendering zeroes, and it explains why the card looks different. */
        <div className="flex items-center gap-2 p-3.5">
          <Clock size={13} color={C.gold} />
          <div className="min-w-0">
            <p className="text-xs font-bold" style={{ color: C.textHi }}>Recap pending</p>
            <p className="text-xs" style={{ color: C.textMid }}>
              Crowd, rating and top track land once the venue files its report.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 p-3.5">
          <div className="text-center">
            <p className="flex items-center justify-center gap-1 text-sm font-bold" style={{ color: C.textHi }}>
              <Users size={11} color={C.textLo} />{card.crowd.toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: C.textLo }}>Crowd</p>
          </div>
          <div className="border-x px-1 text-center" style={{ borderColor: C.line }}>
            <p className="truncate text-sm font-bold" style={{ color: C.textHi }}>{card.topTrack}</p>
            <p className="text-xs" style={{ color: C.textLo }}>Top Track</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: C.gold }}>{card.rating.toFixed(1)}&#9733;</p>
            <p className="text-xs" style={{ color: C.textLo }}>Rating</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between px-3.5 pb-3.5">
        <span className="text-xs" style={{ color: C.textLo }}>{card.date}</span>
        {!hideActions && (
          <button
            onClick={() => onShare(card)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95"
            style={{ background: C.surfaceHi, border: `1px solid ${C.line}`, color: C.textHi }}
          >
            <Share2 size={12} color={C.amethyst} />
            Share
          </button>
        )}
      </div>
    </div>
  );
}

function ShareSheet({ card, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const link = `https://vibepass.app/talent/marcusreyes/${card.id}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      }
    } catch (err) {
      /* clipboard unavailable in this preview - still confirm visually */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-end" style={{ zIndex: 1350 }}>
      <button
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}
        aria-label="Close share sheet"
      />
      <div
        className="relative z-10 flex flex-col overflow-hidden rounded-t-3xl border-t px-5 pt-3 pb-8"
        style={{ background: C.surface, borderColor: C.line, animation: "vpSlideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      >
        <div className="flex justify-center pb-2"><span className="h-1 w-10 rounded-full" style={{ background: C.borderStrong }} /></div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: C.textHi }}>Share this card</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90" style={{ background: C.surfaceHi, border: `1px solid ${C.line}` }}>
            <X size={16} color={C.textHi} />
          </button>
        </div>
        <div className="mt-4"><PortfolioCard card={card} hideActions /></div>
        <button
          onClick={handleCopy}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-transform active:scale-95"
          style={{ background: copied ? C.emerald : C.amethyst, color: copied ? "#052E16" : "#FFFFFF" }}
        >
          {copied ? (
            <Fragment><Check size={16} />Link Copied</Fragment>
          ) : (
            <Fragment><Copy size={16} />Copy Shareable Link</Fragment>
          )}
        </button>
        <p className="mt-2.5 text-center text-xs" style={{ color: C.textLo }}>
          Share it on your own socials to book higher-paying gigs off-platform too.
        </p>
      </div>
    </div>
  );
}

function PortfolioView({ epk, onChangeField, onToggleGenre, onSaveEpk, freeAgentUnlocked, portfolio, onShareCard }) {
  return (
    <div className="px-4 pt-2 pb-2">
      <h1 className="text-xl font-extrabold" style={{ color: C.textHi }}>Portfolio</h1>
      <p className="mt-0.5 text-xs" style={{ color: C.textMid }}>Your living press kit - not a timesheet.</p>

      <div className="mt-4">
        <EpkEditor epk={epk} onChangeField={onChangeField} onToggleGenre={onToggleGenre} onSave={onSaveEpk} freeAgentUnlocked={freeAgentUnlocked} />
      </div>

      <div className="mt-6">
        <SectionTitle>Proof of Performance</SectionTitle>
        <div className="flex flex-col gap-3.5">
          {portfolio.map((card) => (
            <PortfolioCard key={card.id} card={card} onShare={onShareCard} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   VERIFICATION BANNER - shown on the dashboard until vetting
   completes; gates Accept Gig and Cash Out downstream
   ============================================================ */
function VerificationBanner({ onVerify }) {
  return (
    <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl border p-3.5" style={{ borderColor: C.gold + "45", background: "rgba(245,185,66,0.08)" }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(245,185,66,0.16)" }}>
        <AlertCircle size={16} color={C.gold} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold" style={{ color: C.textHi }}>Verification pending</p>
        <p className="text-xs" style={{ color: C.textMid }}>Accepting gigs and cashing out unlock once vetting clears.</p>
      </div>
      <button
        onClick={onVerify}
        className="shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-transform active:scale-95"
        style={{ background: C.gold, color: "#1A1200" }}
      >
        Verify
      </button>
    </div>
  );
}

/* ============================================================
   WALLET - Zero-Fee Fast Track (cash-out), Talent Dividend
   history, Vibe Credits catalog, Direct-to-Talent tips, payouts
   ============================================================ */
function FeeFreeCard({ weeklyGigs, target, balance, onCashOut, disabled }) {
  const feeFreeActive = weeklyGigs >= target;
  const fee = feeFreeActive ? 0 : Math.round(balance * (INSTANT_FEE_PCT / 100) * 100) / 100;
  const remaining = Math.max(0, target - weeklyGigs);
  return (
    <div className="w-full rounded-3xl border p-4" style={{ borderColor: feeFreeActive ? C.emerald + "55" : C.line, background: feeFreeActive ? C.emeraldDim : C.surface }}>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: C.emeraldDim }}>
          <Zap size={15} color={C.emerald} />
        </div>
        <p className="flex-1 text-xs font-bold uppercase tracking-wide" style={{ color: C.emerald }}>Zero-Fee Fast Track</p>
        {feeFreeActive && <Pill color={C.emerald} bg="rgba(34,197,94,0.16)" icon={<BadgeCheck size={11} color={C.emerald} />}>Fee-Free Friday</Pill>}
      </div>
      <p className="text-sm font-semibold" style={{ color: C.textHi }}>
        {feeFreeActive ? `${weeklyGigs} gigs this week - instant fee waived` : `${weeklyGigs} of ${target} gigs this week`}
      </p>
      <div className="mt-2.5"><ProgressBar value={weeklyGigs} max={target} color={C.emerald} /></div>
      <p className="mt-2 text-xs" style={{ color: C.textMid }}>
        {feeFreeActive
          ? "Hit your weekly milestone - any instant cash-out fee this week is absorbed by the venue, not you."
          : `${remaining} more gig${remaining === 1 ? "" : "s"} this week waives your instant cash-out fee entirely.`}
      </p>
      <div className="mt-3.5 rounded-2xl p-3.5" style={{ background: C.surfaceHi, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: C.textLo }}>Available balance</span>
          <span className="font-bold" style={{ color: C.textHi }}>{fmtAEDRound(balance)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1" style={{ color: C.textLo }}><Percent size={11} />Instant fee</span>
          <span className="font-semibold" style={{ color: feeFreeActive ? C.emerald : C.textHi }}>
            {feeFreeActive ? "Waived" : fmtAEDRound(fee)}
          </span>
        </div>
        <div className="mt-2 h-px w-full" style={{ background: C.line }} />
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-semibold" style={{ color: C.textHi }}>You receive</span>
          <span className="font-bold" style={{ color: C.emerald }}>{fmtAEDRound(balance - fee)}</span>
        </div>
      </div>
      <button
        onClick={onCashOut}
        disabled={disabled || balance <= 0}
        className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: C.emerald, color: "#052E16" }}
      >
        <Zap size={15} />
        Cash Out {fmtAEDRound(balance)} Instantly
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs" style={{ color: C.textLo }}>
        <ShieldCheck size={11} color={C.emerald} />
        Settled via an ADGM-regulated payment provider
      </p>
    </div>
  );
}

function CashOutSheet({ amount, fee, onClose, onComplete }) {
  const [stage, setStage] = useState("confirm");
  const net = amount - fee;

  const runCashOut = () => {
    setStage("processing");
    window.setTimeout(() => {
      setStage("success");
      onComplete();
    }, 1500);
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-end" style={{ zIndex: 1320 }}>
      <button
        onClick={() => stage !== "processing" && onClose()}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}
        aria-label="Close cash out"
      />
      <div
        className="relative z-10 flex flex-col overflow-hidden rounded-t-3xl border-t px-5 pt-3 pb-8"
        style={{ background: C.surface, borderColor: C.line, minHeight: 320, animation: "vpSlideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      >
        {stage === "confirm" && (
          <Fragment>
            <div className="flex justify-center pb-2"><span className="h-1 w-10 rounded-full" style={{ background: C.borderStrong }} /></div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: C.textHi }}>Confirm Instant Cash Out</h2>
              <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90" style={{ background: C.surfaceHi, border: `1px solid ${C.line}` }}>
                <X size={16} color={C.textHi} />
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center">
              <p className="text-xs" style={{ color: C.textLo }}>You'll receive</p>
              <p className="mt-1 text-4xl font-extrabold" style={{ color: C.emerald }}>{fmtAEDRound(net)}</p>
              <p className="mt-1 text-xs" style={{ color: C.textMid }}>
                {fee > 0 ? `${fmtAEDRound(amount)} balance minus ${fmtAEDRound(fee)} instant fee` : `${fmtAEDRound(amount)} balance - fee waived this week`}
              </p>
            </div>
            <button
              onClick={runCashOut}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-transform active:scale-95"
              style={{ background: C.emerald, color: "#052E16" }}
            >
              <Zap size={15} />
              Confirm Cash Out
            </button>
            <p className="mt-2.5 text-center text-xs" style={{ color: C.textLo }}>Funds typically land within 60 seconds.</p>
          </Fragment>
        )}
        {stage === "processing" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-11 w-11 rounded-full animate-spin" style={{ border: "3px solid #2A2F3A", borderTopColor: C.emerald }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: C.textHi }}>Sending {fmtAEDRound(net)}...</p>
              <p className="mt-1 text-xs" style={{ color: C.textMid }}>Routing through your linked payout account</p>
            </div>
          </div>
        )}
        {stage === "success" && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: C.emeraldDim }}>
              <BadgeCheck size={30} color={C.emerald} />
            </div>
            <p className="mt-4 text-lg font-bold" style={{ color: C.textHi }}>{fmtAEDRound(net)} Sent</p>
            <p className="mt-1 text-xs" style={{ color: C.textMid }}>Cashed out instantly - no waiting for payout day.</p>
            <button
              onClick={onClose}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-full text-sm font-bold transition-transform active:scale-95"
              style={{ background: C.surfaceHi, border: `1px solid ${C.line}`, color: C.textHi }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreditCatalogCard({ item, balance, redeemed, onRedeem }) {
  const Icon = item.icon;
  const affordable = balance >= item.cost;
  return (
    <div className="flex items-center gap-3 rounded-2xl border p-3.5" style={{ borderColor: C.line, background: C.surfaceHi }}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: "rgba(245,185,66,0.14)" }}>
        <Icon size={18} color={C.gold} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: C.textHi }}>{item.label}</p>
        <p className="truncate text-xs" style={{ color: C.textLo }}>{item.detail}</p>
      </div>
      <button
        onClick={() => onRedeem(item)}
        disabled={redeemed || !affordable}
        className="shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-transform active:scale-95 disabled:cursor-not-allowed"
        style={
          redeemed
            ? { background: "transparent", color: C.emerald, border: `1px solid ${C.emerald}` }
            : affordable
            ? { background: C.gold, color: "#1A1200" }
            : { background: C.surface, color: C.textLo, border: `1px solid ${C.line}` }
        }
      >
        {redeemed ? "Redeemed" : affordable ? `${item.cost} cr` : `Need ${item.cost - balance} more`}
      </button>
    </div>
  );
}

function TipRow({ tip }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border p-3.5" style={{ borderColor: C.line, background: C.surfaceHi }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: C.emeraldDim }}>
        <Banknote size={15} color={C.emerald} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold" style={{ color: C.textHi }}>{tip.from}</p>
          <span className="shrink-0 text-sm font-bold" style={{ color: C.emerald }}>+{fmtAEDRound(tip.amount)}</span>
        </div>
        {tip.note && <p className="mt-0.5 text-xs italic" style={{ color: C.textMid }}>&ldquo;{tip.note}&rdquo;</p>}
        <p className="mt-0.5 text-xs" style={{ color: C.textLo }}>{tip.date}</p>
      </div>
    </div>
  );
}

function PayoutRow({ payout }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border p-3.5" style={{ borderColor: C.line, background: C.surfaceHi }}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowUpRight size={15} color={C.textMid} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold" style={{ color: C.textHi }}>{payout.event}</p>
          <p className="text-xs" style={{ color: C.textLo }}>{payout.date} - {payout.status}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold" style={{ color: C.textHi }}>{fmtAEDRound(payout.gross)}</p>
        <p className="text-xs" style={{ color: payout.fee === 0 ? C.emerald : C.textLo }}>{payout.fee === 0 ? "No fee" : `-${fmtAEDRound(payout.fee)} fee`}</p>
      </div>
    </div>
  );
}

function TalentWalletView({
  walletBalance, weeklyGigs, feeFreeTarget, onOpenCashOut, verified,
  dividends, credits, redeemedIds, onRedeem, tips, payouts,
}) {
  const totalDividends = dividends.reduce((sum, d) => sum + d.amount, 0);
  const totalTips = tips.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="px-4 pt-2 pb-2">
      <h1 className="text-xl font-extrabold" style={{ color: C.textHi }}>Wallet</h1>
      <p className="mt-0.5 text-xs" style={{ color: C.textMid }}>Every dirham here is yours - dividends, credits and tips included.</p>

      <div className="mt-4">
        <FeeFreeCard weeklyGigs={weeklyGigs} target={feeFreeTarget} balance={walletBalance} onCashOut={onOpenCashOut} disabled={!verified} />
      </div>

      <div className="mt-6">
        <SectionTitle right={<span className="text-xs font-bold" style={{ color: C.emerald }}>+{fmtAEDRound(totalDividends)} total</span>}>
          Talent Dividend
        </SectionTitle>
        <div className="flex flex-col gap-3">
          {dividends.map((d) => (
            <TalentDividendCard key={d.id} dividend={d} onOpen={() => {}} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle right={<Pill color={C.gold} bg="rgba(245,185,66,0.12)" icon={<Gift size={11} color={C.gold} />}>{credits.toLocaleString()} cr</Pill>}>
          Unused Vibe Credits
        </SectionTitle>
        <p className="mb-2.5 text-xs" style={{ color: C.textLo }}>+10 credits per guest you bring, +5 per 5-star review mentioning your set.</p>
        <div className="flex flex-col gap-2.5">
          {CREDIT_CATALOG.map((item) => (
            <CreditCatalogCard key={item.id} item={item} balance={credits} redeemed={redeemedIds.includes(item.id)} onRedeem={onRedeem} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle right={<span className="text-xs font-bold" style={{ color: C.emerald }}>+{fmtAEDRound(totalTips)} this month</span>}>
          Direct-to-Talent Tips
        </SectionTitle>
        <p className="mb-2.5 text-xs" style={{ color: C.textLo }}>100% yours - Vibe Pass and the venue take zero cut of tips.</p>
        {tips.length === 0 ? (
          <EmptyState icon={Banknote} title="No tips yet" desc="Tips from attendees land here in real time, straight to you." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {tips.map((t) => (
              <TipRow key={t.id} tip={t} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 mb-1">
        <SectionTitle>Payout History</SectionTitle>
        <div className="flex flex-col gap-2.5">
          {payouts.map((p) => (
            <PayoutRow key={p.id} payout={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROFILE - verification status + account + compliance footer
   ============================================================ */
function TalentProfileView({ verified, verificationId, verificationDate, workAuthType, emiratesDigits, onOpenVerification }) {
  const authLabel = (workAuthOptions.find((o) => o.value === workAuthType) || {}).label || "Not submitted yet";
  const idTail = emiratesDigits.length >= 4 ? emiratesDigits.slice(-4) : null;

  const rows = [
    {
      icon: <Fingerprint size={16} color={C.amethyst} />,
      label: "UAE Pass",
      value: verified ? "Linked & verified" : "Not linked",
      valueColor: verified ? C.emerald : C.textLo,
    },
    {
      icon: <CreditCard size={16} color={C.amethyst} />,
      label: "Emirates ID",
      value: idTail ? `On file -${idTail}` : "Not provided",
      valueColor: idTail ? C.textMid : C.textLo,
    },
    {
      icon: <Briefcase size={16} color={C.amethyst} />,
      label: "Work Authorization",
      value: authLabel,
      valueColor: workAuthType ? C.textMid : C.textLo,
    },
  ];

  return (
    <div className="px-4 pt-2 pb-2">
      <div className="flex flex-col items-center pt-4">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold"
          style={{ backgroundImage: `linear-gradient(135deg, ${C.emerald}, ${C.amethyst})`, color: "#0A0A0C" }}
        >
          {TALENT.avatarInitial}
        </div>
        <p className="mt-3 text-lg font-bold" style={{ color: C.textHi }}>{TALENT.name}</p>
        <p className="text-xs" style={{ color: C.textMid }}>{TALENT.craft} - member since {TALENT.memberSinceLabel}</p>
      </div>

      <button
        onClick={onOpenVerification}
        className="mt-6 flex w-full items-center gap-3 rounded-3xl border p-4 text-left transition-transform active:scale-95"
        style={{ borderColor: verified ? C.emerald + "55" : C.gold + "55", background: verified ? C.emeraldDim : "rgba(245,185,66,0.08)" }}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: verified ? C.emerald : C.gold }}>
          {verified ? <BadgeCheck size={20} color="#052E16" /> : <ShieldCheck size={20} color="#1A1200" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: C.textHi }}>{verified ? "Verified Talent" : "Complete Verification"}</p>
          <p className="truncate text-xs" style={{ color: C.textMid }}>
            {verified ? `${verificationId} - issued ${verificationDate}` : "Required before you can accept gigs or cash out"}
          </p>
        </div>
        <ChevronRight size={16} color={C.textLo} />
      </button>

      <div className="mt-4 overflow-hidden rounded-3xl border" style={{ borderColor: C.line, background: C.surface }}>
        {rows.map((r, i) => (
          <div key={r.label} className="flex items-center gap-3 px-4 py-3.5" style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
            {r.icon}
            <span className="flex-1 text-sm" style={{ color: C.textHi }}>{r.label}</span>
            <span className="text-xs font-medium" style={{ color: r.valueColor }}>{r.value}</span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs" style={{ color: C.textLo }}>Epicenter Technologies LTD - Vibe Pass Talent v1.4.0</p>
      <p className="mt-1 text-center text-xs" style={{ color: C.textLo }}>Talent onboarding regulated under MoHRE - payouts settled via ADGM-regulated rails.</p>
    </div>
  );
}

/* ============================================================
   BOTTOM NAVIGATION - Material 3, 5-tab talent dashboard
   ============================================================ */
function TalentBottomNav({ tab, setTab, requestCount }) {
  return (
    <div className="shrink-0 border-t" style={{ background: "#0D0F13", borderColor: C.line }}>
      <div className="flex items-stretch justify-around px-1 pt-2">
        {TALENT_NAV_ITEMS.map((it) => {
          const active = tab === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className="flex w-16 flex-col items-center gap-1 py-1 transition-transform active:scale-95"
              aria-label={it.label}
            >
              <span
                className="relative flex h-8 w-12 items-center justify-center rounded-full transition-colors"
                style={{ background: active ? C.emeraldDim : "transparent" }}
              >
                <Icon size={18} color={active ? C.emerald : C.textLo} strokeWidth={active ? 2.4 : 2} />
                {it.id === "bookings" && requestCount > 0 && (
                  <span
                    className="absolute -top-0.5 right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: C.amethyst, color: "#FFFFFF", fontSize: 9 }}
                  >
                    {requestCount}
                  </span>
                )}
              </span>
              <span className="text-xs font-medium" style={{ color: active ? C.textHi : C.textLo, fontSize: 10 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-center pb-2 pt-1.5">
        <span className="h-1 w-28 rounded-full" style={{ background: "rgba(255,255,255,0.28)" }} />
      </div>
    </div>
  );
}

/* ============================================================
   SHARED CHROME — status bar + hub switcher
   Rendered once by the root VibePassApp shell, above whichever
   hub (Consumer / Talent) is currently active.
   ============================================================ */
function StatusBar({ variant = "consumer" }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div
      className="flex items-center justify-between px-5 pt-2 pb-1 shrink-0 select-none"
      style={{ background: C.bg }}
    >
      <span className="text-xs font-semibold" style={{ color: C.textHi }}>
        {hh}:{mm}
      </span>
      {variant === "talent" ? (
        <div className="flex items-center gap-2" style={{ color: C.textHi }}>
          <span className="text-xs font-medium tracking-wide" style={{ color: C.textLo }}>
            VIBE PASS TALENT
          </span>
        </div>
      ) : variant === "promoter" ? (
        <div className="flex items-center gap-2" style={{ color: C.textHi }}>
          <span className="text-xs font-medium tracking-wide" style={{ color: C.textLo }}>
            VIBE PASS PROMOTER
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2" style={{ color: C.textHi }}>
          <Signal size={13} strokeWidth={2.2} />
          <Wifi size={13} strokeWidth={2.2} />
          <Battery size={16} strokeWidth={2.2} />
        </div>
      )}
    </div>
  );
}

function GoogleG({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

/* Top-level hub switcher - the "Switch Profile" pattern from the account
   spec, surfaced as a persistent segmented control rather than a settings
   menu toggle, so moving between the Consumer Hub and Talent Marketplace
   is always one tap away. Both hubs stay mounted (see root shell) so
   switching never loses a ticket in progress or verification state. */
/* Shared by HubSwitcher (rendering the pills) and VibePassApp (swipe
   order, confirmation-popup labels, and mapping a hub id to the
   matching AuthModal role id when a first-time switch needs the
   sign-up flow again). */
const HUB_SWITCHER_ITEMS = [
  { id: "consumer", label: "Fan Pass", icon: Ticket },
  { id: "talent", label: "Talent Pass", icon: Mic2 },
  { id: "promoter", label: "Promoter", icon: Building2 },
];

function HubSwitcher({ activeHub, onSwitch }) {
  const items = HUB_SWITCHER_ITEMS;
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeHub));
  const n = items.length;
  return (
    <div className="shrink-0 px-4 pb-3 pt-1" style={{ background: C.bg }}>
      <div
        className="relative flex items-center rounded-full p-1"
        style={{ background: C.surface, border: `1px solid ${C.line}` }}
      >
        <div
          className="absolute inset-y-1 rounded-full transition-all duration-300 ease-out"
          style={{
            backgroundImage: `linear-gradient(90deg, ${C.emerald}, ${C.amethyst})`,
            width: `calc((100% - 8px) / ${n})`,
            left: `calc(4px + (100% - 8px) / ${n} * ${activeIndex})`,
          }}
        />
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeHub === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSwitch(item.id)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-colors duration-200 ${focusRing}`}
              style={{ color: active ? "#0A0A0C" : C.textMid }}
              aria-pressed={active}
            >
              <Icon size={14} strokeWidth={2.4} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
/* ============================================================
   SPLASH SCREEN — cinematic logo reveal
   NOTE ON IMPLEMENTATION: framer-motion is not available in this
   artifact's sandboxed React environment (it isn't one of the
   pre-provided libraries), the same category of constraint that
   previously forced the map off Leaflet and onto D3/SVG. Framer's
   API - staggered variants, spring transitions - is fully
   reproduced here with plain CSS @keyframes (added to the shared
   <style> block below) orchestrated by a phase counter, so the
   exact same beats (icon pop -> wordmark reveal -> shimmer sweep
   -> tagline -> progress fill -> exit) still play. If this file is
   ever moved into a standard Next.js/v0 setup where framer-motion
   resolves, each phase below maps 1:1 onto a <motion.div> variant.

   The wordmark itself - "Vibe" in solid C.textHi, "Pass" clipped
   to a 90deg emerald->amethyst gradient, font-extrabold
   tracking-tight - is copied exactly from AppHeader (Consumer Hub's
   Feed/Map header), just scaled up for a full-bleed intro moment.
   The icon badge reuses the rounded-3xl gradient-border + NFC pulse
   rings motif already used for the "Vibe Pass Activated" ticket
   confirmation, so the intro and the rest of the app share one
   visual signature instead of introducing a new one. */
function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState(0);
  // 0 mount -> 1 icon in -> 2 wordmark in -> 3 tagline + progress -> 4 exit

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 620),
      setTimeout(() => setPhase(3), 1120),
      setTimeout(() => setPhase(4), 2450),
      setTimeout(() => onFinish(), 2950),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  const handleSkip = useCallback(() => onFinish(), [onFinish]);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: C.bg,
        zIndex: 3000,
        opacity: phase >= 4 ? 0 : 1,
        transform: phase >= 4 ? "scale(1.08)" : "scale(1)",
        transition: "opacity 0.5s ease-in, transform 0.5s ease-in",
        pointerEvents: phase >= 4 ? "none" : "auto",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(380px 260px at 82% -2%, rgba(168,85,247,0.20), transparent), radial-gradient(380px 260px at 12% 102%, rgba(34,197,94,0.16), transparent)",
          animation: "vpSplashAmbient 3.6s ease-in-out infinite",
        }}
      />

      {/* icon mark - reuses the rounded-3xl gradient badge + NFC pulse rings
          motif from the ticket-purchase confirmation screen */}
      <div
        className="relative flex h-28 w-28 items-center justify-center"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          animation: phase >= 1 ? "vpSplashIconIn 0.6s cubic-bezier(0.2,0.9,0.3,1.1) both" : "none",
        }}
      >
        <span
          className="absolute h-24 w-24 rounded-full border-2"
          style={{
            borderColor: C.emerald,
            animation: phase >= 1 ? "vpNfcPulse 2.1s ease-out infinite" : "none",
          }}
        />
        <span
          className="absolute h-24 w-24 rounded-full border-2"
          style={{
            borderColor: C.amethyst,
            animation: phase >= 1 ? "vpNfcPulse 2.1s ease-out 0.7s infinite" : "none",
          }}
        />
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-3xl p-0.5"
          style={{ backgroundImage: `linear-gradient(135deg, ${C.emerald}, ${C.amethyst})` }}
        >
          <div
            className="flex h-full w-full items-center justify-center rounded-3xl"
            style={{ background: C.bg }}
          >
            <ContactlessIcon size={34} color="#FFFFFF" />
          </div>
        </div>
      </div>

      {/* wordmark - identical treatment to AppHeader, scaled up */}
      <div
        className="relative mt-7"
        style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        }}
      >
        <h1 className="relative overflow-hidden text-6xl font-extrabold tracking-tight">
          <span style={{ color: C.textHi }}>Vibe</span>
          <span
            style={{
              backgroundImage: `linear-gradient(90deg, ${C.emerald}, ${C.amethyst})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Pass
          </span>
          {phase >= 2 && (
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
              style={{
                backgroundImage: "linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)",
                animation: "shimmer 1.15s ease-out 0.2s 1",
              }}
            />
          )}
        </h1>
      </div>

      {/* tagline - same MapPin + location format as AppHeader's subtitle */}
      <p
        className="mt-2.5 flex items-center gap-1 text-xs font-medium"
        style={{
          color: C.textMid,
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 0.5s ease-out",
        }}
      >
        <MapPin size={11} color={C.emerald} /> Abu Dhabi &middot; Dubai, UAE
      </p>

      {/* progress sweep */}
      <div
        className="mt-8 h-1 w-36 overflow-hidden rounded-full"
        style={{
          background: C.surfaceHi,
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 0.4s ease-out",
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            backgroundImage: `linear-gradient(90deg, ${C.emerald}, ${C.amethyst})`,
            width: phase >= 3 ? "100%" : "0%",
            transition: "width 1.25s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleSkip}
        className={`absolute bottom-6 right-6 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-opacity duration-300 ${focusRing}`}
        style={{
          color: C.textMid,
          border: `1px solid ${C.line}`,
          opacity: phase >= 1 && phase < 4 ? 1 : 0,
        }}
      >
        Skip
      </button>
    </div>
  );
}
/* ============================================================
   PROMOTER-POSTED EVENTS — shared shape
   One posted event, one object, three views. The Consumer Feed
   reads the top-level fields exactly like any ALL_EVENTS entry
   (via the unmodified FeedCard/EventSheet/BookingFlow), so this
   deliberately mirrors that shape field-for-field rather than
   inventing a new one. Talent's gig list only ever sees this
   object when hasOpenSlot is true, via roleNeeded/hourlyRateAED.
   The Promoter's own "my posts" list reads title/date/status.

   pricingType is "flat", not "tiered" or "seat-selection" - the
   only place pricingType is actually read anywhere in this file
   is `seatBased = event.pricingType === "seat-selection"` inside
   BookingFlow, so "flat" already renders through the same general
   (non-seat) path today's tiered events use. ticketOptions holds
   exactly one entry, so there is nothing to tier-switch between -
   sidestepping the known, unresolved tiered-pricing rendering
   issue without touching that code at all. */
const POSTED_EVENT_FALLBACK_IMG =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80";

function createPostedEvent({
  title,
  date,
  time,
  venue,
  category,
  ticketPriceAED,
  coverImage,
  hasOpenSlot,
  openSlots,
}) {
  const permitSuffix = String(10000 + Math.floor(Math.random() * 89999));
  const slots = hasOpenSlot && openSlots ? openSlots : [];
  const talentSummary =
    slots.length === 0
      ? "Fully Staffed"
      : slots.length === 1
      ? `Open Slot \u2013 ${slots[0].role}`
      : `${slots.length} Open Slots \u2013 ${slots.map((s) => s.role).join(", ")}`;
  return {
    id: `promo-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type: "event",
    category,
    zone: venue,
    title,
    venue,
    date,
    time,
    price: ticketPriceAED,
    pricingType: "flat",
    ticketOptions: [
      {
        id: "standard",
        name: "Standard",
        subtitle: "General Admission",
        price: ticketPriceAED,
        perks: "Verified Vibe Pass entry",
        left: 500,
      },
    ],
    permit: `DCT-AD-2026-${permitSuffix}`,
    authority: "DCT Abu Dhabi",
    tag: "Promoter Listing",
    accent: C.amethyst,
    capacity: "Open capacity",
    talent: talentSummary,
    desc: `Posted by ${PROMOTER_MOCK_PROFILE.businessName}.`,
    img: coverImage || POSTED_EVENT_FALLBACK_IMG,
    lat: 24.4667,
    lng: 54.3667,
    postedByPromoter: true,
    hasOpenSlot: slots.length > 0,
    openSlots: slots,
    status: "Active",
  };
}

/* "A, B, C & D" style joining for the swipe tutorial's tab list, so
   each hub's message reads naturally rather than as a flat comma list. */
function formatTabList(labels) {
  if (labels.length <= 1) return labels.join("");
  if (labels.length === 2) return labels.join(" & ");
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

/* Swipe tutorial (teaches the in-hub swipe-to-cycle-tabs gesture built
   in Nav-6/7/8) - shared across ConsumerHub, TalentHub and
   PromoterHub rather than three separate implementations, since the
   only real difference between them is which tab labels to list and
   which color tokens to render with. Takes a normalized `tokens`
   object rather than C or PC directly, so the same component serves
   both token systems without knowing which hub is using it. A single
   centered card rather than a spotlight-on-an-element: unlike the
   landing page's tutorial, there's no one small thing to point at
   here - the whole screen is the swipeable surface. Reuses vpFadeIn/
   vpPop (already defined in VibePassApp's shared style block, which
   every hub renders inside) and the new vpSwipeHint keyframe for the
   sliding-dot gesture hint. */
function SwipeTutorialOverlay({ onDismiss, tabLabels, tokens }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ zIndex: 2200, background: "rgba(0,0,0,0.72)", animation: "vpFadeIn 0.25s ease" }}
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-xs rounded-3xl border p-5 text-center"
        style={{ background: tokens.surface, borderColor: tokens.line, animation: "vpPop 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-10 w-24 items-center justify-between">
          <ChevronLeft size={20} color={tokens.accent} />
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ background: tokens.accent, animation: "vpSwipeHint 1.6s ease-in-out infinite" }}
          />
          <ChevronRight size={20} color={tokens.accent} />
        </div>
        <p className="mt-3 text-sm font-bold" style={{ color: tokens.textHi }}>
          Swipe to switch tabs
        </p>
        <p className="mt-1.5 text-xs" style={{ color: tokens.textMid }}>
          Swipe left or right anywhere on this screen to move between {formatTabList(tabLabels)}.
        </p>
        <button
          onClick={onDismiss}
          className={`mt-4 w-full rounded-full py-2.5 text-xs font-bold transition-transform active:scale-95 ${focusRing}`}
          style={{ background: tokens.accent, color: tokens.accentText }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function ConsumerHub({ postedEvents = [], isActiveHub }) {
  const [tab, setTab] = useState("feed");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [toast, setToast] = useState(null);

  /* Newest promoter posts lead, then the seeded catalog - one merged
     array so Feed, Map, and event lookup all agree on what exists.
     FeedCard/EventSheet/BookingFlow are untouched: a posted event's
     shape already matches ALL_EVENTS field-for-field. */
  const combinedEvents = useMemo(() => [...postedEvents, ...ALL_EVENTS], [postedEvents]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const handleSelect = useCallback((ev) => setSelectedEvent(ev), []);
  const handleBook = useCallback((ev) => {
    setSelectedEvent(null);
    setToast(`Table request sent: ${ev.title}`);
  }, []);

  const handleMenu = useCallback((ev) => {
    setToast(`${ev.title} menu preview coming soon`);
  }, []);

  /* Finalise a simulated checkout: mint the wallet ticket */
  const completeBooking = useCallback((ev, option, qty, order) => {
    const total = option.price * qty;
    const ticket = {
      id: `${ev.id}-${Date.now()}`,
      order,
      holder: CURRENT_USER.name,
      event: ev,
      option,
      qty,
      total,
    };
    setTickets((prev) => [ticket, ...prev]);
    setActiveTicketId(ticket.id);
    setToast(`Payment authorised: ${fmtAED(total)}`);
  }, []);

  const goWallet = useCallback(() => {
    setSelectedEvent(null);
    setTab("tickets");
  }, []);

  /* Swipe left/right cycles through this hub's own 5 tabs (Feed, Map,
     Search, Tickets, Profile), in order - it no longer switches roles
     (that moved to tapping the hub-switcher pills directly). Same
     mechanics as TrendingModule and the former hub-switcher swipe:
     60px threshold, a mostly-vertical gesture is ignored so normal
     scrolling isn't mistaken for a tab swipe, bounded at each end. */
  const tabTouchStartRef = useRef(null);
  const handleTabTouchStart = useCallback((e) => {
    const t = e.touches[0];
    tabTouchStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      /* Leaflet reads a horizontal drag as a pan, so a gesture that begins on
      the map belongs to the map. One starting on the header, the filter chips
      or the caption underneath is still a tab swipe — hence tracking where the
      touch started rather than disabling the gesture for the whole Map tab. */
      onMap: Boolean(t.target && t.target.closest && t.target.closest(".leaflet-container")),
    };
  }, []);
  const handleTabTouchEnd = useCallback(
    (e) => {
      const start = tabTouchStartRef.current;
      tabTouchStartRef.current = null;
      if (!start) return;
      /* Only the map itself claims the gesture; the rest of the Map tab
      still swipes between tabs. */
      if (start.onMap) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const SWIPE_THRESHOLD = 60;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const order = CONSUMER_NAV_ITEMS.map((it) => it.id);
      const currentIndex = order.indexOf(tab);
      const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= 0 && nextIndex < order.length) setTab(order[nextIndex]);
    },
    [tab]
  );

  /* Swipe tutorial - fires once, the first time this hub becomes the
     active one (covers both "this is the hub the app opened into"
     and "the user just switched here for the first time"). The ref
     tracks "already shown this session" independent of the tutorial's
     own visible/dismissed state, so switching away and back doesn't
     re-trigger it. */
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const swipeTutorialTriggeredRef = useRef(false);
  useEffect(() => {
    if (isActiveHub && !swipeTutorialTriggeredRef.current) {
      swipeTutorialTriggeredRef.current = true;
      const t = setTimeout(() => setShowSwipeTutorial(true), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isActiveHub]);

  return (
    <>
        {toast && (
          <div
            className="absolute left-0 right-0 top-10 flex justify-center px-6"
            style={{ zIndex: 1400 }}
          >
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
              style={{
                background: "rgba(17,19,24,0.96)",
                border: "1px solid rgba(34,197,94,0.4)",
                color: C.textHi,
                animation: "vpToast 2.6s ease forwards",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              <BadgeCheck size={13} color={C.emerald} />
              {toast}
            </div>
          </div>
        )}
        <main
          className="relative flex-1 overflow-y-auto vp-noscroll pb-6"
          style={{ zIndex: 2 }}
          onTouchStart={handleTabTouchStart}
          onTouchEnd={handleTabTouchEnd}
        >
          {tab === "feed" && (
            <FeedView
              events={combinedEvents}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              onSelect={handleSelect}
              selectedId={selectedEvent ? selectedEvent.id : null}
            />
          )}
          {tab === "map" && (
            <MapView
              events={combinedEvents}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              onSelect={handleSelect}
              selectedId={selectedEvent ? selectedEvent.id : null}
            />
          )}
          {tab === "search" && (
            <SearchView
              events={combinedEvents}
              onSelect={handleSelect}
              selectedId={selectedEvent ? selectedEvent.id : null}
            />
          )}
          {tab === "tickets" && (
            <ConsumerWalletView
              tickets={tickets}
              activeId={activeTicketId}
              setActiveId={setActiveTicketId}
              goBrowse={() => setTab("feed")}
            />
          )}
          {tab === "profile" && <ConsumerProfileView />}
        </main>
        {selectedEvent && (
          <EventSheet
            event={selectedEvent}
            onComplete={completeBooking}
            onGoWallet={goWallet}
            onBook={handleBook}
            onMenu={handleMenu}
            onClose={() => setSelectedEvent(null)}
          />
        )}
        <BottomNav
          tab={tab}
          setTab={setTab}
          ticketCount={tickets.length}
          role={CURRENT_USER.role}
        />
        {showSwipeTutorial && (
          <SwipeTutorialOverlay
            onDismiss={() => setShowSwipeTutorial(false)}
            tabLabels={CONSUMER_NAV_ITEMS.map((it) => it.label)}
            tokens={{ surface: C.surface, line: C.line, textHi: C.textHi, textMid: C.textMid, accent: C.emerald, accentText: "#052E16" }}
          />
        )}
    </>
  );
}
function TalentHub({ postedEvents = [], isActiveHub }) {
  /* ---- onboarding / verification state (retained from original wizard) ----
     Presentation-mode defaults: every field below is pre-filled with the
     same mock identity used on the Landing Page's Talent KYC form, and
     the wizard starts already completed (verified=true, showOnboarding=
     false) so arriving here via any of the app's fast-login paths drops
     straight onto the dashboard instead of an empty, unverified wizard.
     The real wizard is untouched and still fully reachable - "Run
     Verification Again" (VerifiedBadge) and the Profile tab's "Manage
     Verification" action both still call the original handleReset /
     handleOpenOnboarding exactly as before. */
  const [currentStep, setCurrentStep] = useState(1);
  const [uaePassLinked, setUaePassLinked] = useState(true);
  const [uaePassLoading, setUaePassLoading] = useState(false);
  const [emiratesDigits, setEmiratesDigits] = useState("784199412345671");
  const [passportFile, setPassportFile] = useState({ name: "passport_verified.jpg", size: 2458624 });
  const [passportError, setPassportError] = useState(null);
  const [workAuthType, setWorkAuthType] = useState("mohre");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [complianceDoc, setComplianceDoc] = useState({ name: "mohre_permit_verified.pdf", size: 1887436 });
  const [complianceError, setComplianceError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState("idle");
  const [submitProgress, setSubmitProgress] = useState(0);
  const [verificationId, setVerificationId] = useState(() => generateVerificationId());
  const [verificationDate, setVerificationDate] = useState(() => formatIssueDate(new Date()));
  const [verified, setVerified] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const passportInputRef = useRef(null);
  const complianceInputRef = useRef(null);
  const uaePassTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  /* ---- dashboard state ---- */
  const [activeTab, setActiveTab] = useState("home");
  const [activeSheet, setActiveSheet] = useState(null); // null | 'milestones' | 'share' | 'cashout'
  const [shareCard, setShareCard] = useState(null);
  const [toast, setToast] = useState(null);

  const [workedVenues, setWorkedVenues] = useState(() =>
    Array.from(new Set([...SEED_PORTFOLIO.map((p) => p.venue), ...SEED_BOOKINGS.map((b) => b.venue)]))
  );
  const [vibePioneerStreak] = useState(7);
  const [voteSelectedId, setVoteSelectedId] = useState(null);
  const [claimedSlotIds, setClaimedSlotIds] = useState([]);
  const [mentorshipEnabled, setMentorshipEnabled] = useState(true);

  const [gigRequests, setGigRequests] = useState(SEED_REQUESTS);
  const [bookings, setBookings] = useState(SEED_BOOKINGS);

  /* Merges promoter posts with open talent slots into real gigRequests
     state (not a computed overlay), so a synced item is a genuine
     member of that array - Accept/Decline via handleAcceptRequest/
     handleDeclineRequest work on it exactly as they do on a seed
     request, no special-casing needed anywhere else.
     An event can now post multiple roles (the Post Event form's "Add
     Another Role"), so this flattens each event's openSlots into its
     own gig-request, one per role, each with its own stable id
     (`${eventId}-slot-${index}`) - accepting or declining one role
     from an event doesn't touch its siblings.
     syncedPostedGigIds tracks every slot id ever synced, independent
     of whether it's still in gigRequests right now. Without it,
     accepting or declining a promoter-posted gig would only remove it
     from gigRequests - the next unrelated post would re-trigger this
     effect, see the id missing from the current gigRequests snapshot,
     and silently resurrect an already-actioned request. */
  const syncedPostedGigIds = useRef(new Set());
  useEffect(() => {
    const newOpenSlotGigs = [];
    postedEvents.forEach((e) => {
      if (!e.hasOpenSlot || !e.openSlots) return;
      e.openSlots.forEach((slot, index) => {
        const gigId = `${e.id}-slot-${index}`;
        if (syncedPostedGigIds.current.has(gigId)) return;
        newOpenSlotGigs.push({
          id: gigId,
          event: e.title,
          venue: e.venue,
          date: e.date,
          time: e.time,
          rate: slot.hourlyRateAED,
          note: `Open call posted by ${PROMOTER_MOCK_PROFILE.businessName}`,
          lat: e.lat,
          lng: e.lng,
          roleNeeded: slot.role,
        });
      });
    });
    if (newOpenSlotGigs.length === 0) return;
    newOpenSlotGigs.forEach((g) => syncedPostedGigIds.current.add(g.id));
    setGigRequests((prev) => [...newOpenSlotGigs, ...prev]);
  }, [postedEvents]);

  const [weeksActiveStreak, setWeeksActiveStreak] = useState(MILESTONE_TARGETS.restRewardWeeks);

  const [walletBalance, setWalletBalance] = useState(INITIAL_WALLET_BALANCE_AED);
  const [weeklyGigs] = useState(WEEKLY_GIGS_THIS_WEEK);
  const [dividends] = useState(SEED_DIVIDENDS);
  const [payouts] = useState(SEED_PAYOUTS);
  const [tips] = useState(SEED_TIPS);
  const [vibeCredits, setVibeCredits] = useState(620);
  const [redeemedCreditIds, setRedeemedCreditIds] = useState([]);

  const [epk, setEpk] = useState(INITIAL_EPK);
  const [portfolio] = useState(SEED_PORTFOLIO);

  /* A gig that has already happened is no longer a booking. Bookings carry a
     startsAt timestamp so the split is by real elapsed time rather than by the
     printed string, and a finished one moves into the portfolio as proof of
     performance.

     Its crowd, rating and top track are deliberately absent rather than
     invented: those numbers arrive after the event, so the card shows a recap
     pending state until they do.

     In practice the seeded bookings are generated a few days ahead of load and
     will not lapse inside a session. This exists so the hub behaves correctly
     whenever it is given a booking that has, rather than showing a past date
     under "Upcoming". */
  /* "Now" is state on a one-minute tick rather than a Date.now() call during
     render: reading the clock while rendering is impure, and it would also
     freeze the split until `bookings` happened to change. */
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => !b.startsAt || b.startsAt >= nowTs),
    [bookings, nowTs]
  );
  const completedBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.startsAt && b.startsAt < nowTs)
        .map((b) => ({
          id: `recap-${b.id}`,
          event: b.event,
          venue: b.venue,
          date: b.date,
          lat: b.lat,
          lng: b.lng,
          awaitingRecap: true,
        })),
    [bookings, nowTs]
  );
  const portfolioCards = useMemo(
    () => [...completedBookings, ...portfolio],
    [completedBookings, portfolio]
  );

  /* ---- derived values ---- */
  const distinctVenues = workedVenues.length;
  const freeAgentUnlocked = distinctVenues >= MILESTONE_TARGETS.independentAgentVenues;
  const vibePioneerUnlocked = vibePioneerStreak >= MILESTONE_TARGETS.vibePioneerStreak;
  const tenureMonths = monthsSince(TALENT.memberSinceISO);
  const mentorshipUnlocked = tenureMonths >= MILESTONE_TARGETS.mentorshipMonths;
  const feeFreeActive = weeklyGigs >= MILESTONE_TARGETS.feeFreeGigs;
  const cashOutFee = feeFreeActive ? 0 : Math.round(walletBalance * (INSTANT_FEE_PCT / 100) * 100) / 100;
  const latestDividend = dividends[0];
  const communityVote = { ...COMMUNITY_VOTE, selectedId: voteSelectedId };

  /* ---- onboarding effects (retained) ---- */
  useEffect(() => {
    const handleOutsideInteraction = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
    };
    const handleKeyboardEsc = (event) => {
      if (event.key === "Escape") setDropdownOpen(false);
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideInteraction);
      document.addEventListener("touchstart", handleOutsideInteraction);
      document.addEventListener("keydown", handleKeyboardEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
      document.removeEventListener("keydown", handleKeyboardEsc);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    return () => {
      if (uaePassTimeoutRef.current) clearTimeout(uaePassTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (passportFile && passportFile.previewUrl) URL.revokeObjectURL(passportFile.previewUrl);
    };
  }, [passportFile]);

  useEffect(() => {
    if (submissionPhase !== "submitting") return undefined;
    const interval = setInterval(() => {
      setSubmitProgress((prev) => (prev >= 100 ? 100 : prev + 2));
    }, 45);
    return () => clearInterval(interval);
  }, [submissionPhase]);

  useEffect(() => {
    if (submissionPhase !== "submitting" || submitProgress < 100) return undefined;
    const timeoutId = setTimeout(() => {
      setVerificationId(generateVerificationId());
      setVerificationDate(formatIssueDate(new Date()));
      setSubmissionPhase("verified");
    }, 700);
    return () => clearTimeout(timeoutId);
  }, [submissionPhase, submitProgress]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  /* ---- onboarding handlers (retained) ---- */
  const handleUaePassLink = () => {
    setUaePassLoading(true);
    uaePassTimeoutRef.current = setTimeout(() => {
      setUaePassLoading(false);
      setUaePassLinked(true);
    }, 2200);
  };

  const handleEmiratesChange = (e) => {
    setEmiratesDigits(e.target.value.replace(/\D/g, "").slice(0, 15));
  };

  const handlePassportPick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!isAcceptedFileType(file)) {
      setPassportError("Unsupported file type. Please upload a JPG, PNG or PDF.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setPassportError("File exceeds the 10MB limit. Please choose a smaller file.");
      e.target.value = "";
      return;
    }
    setPassportError(null);
    if (passportFile && passportFile.previewUrl) URL.revokeObjectURL(passportFile.previewUrl);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setPassportFile({ name: file.name, size: file.size, previewUrl });
    e.target.value = "";
  };

  const handlePassportRemove = () => {
    setPassportFile(null);
    setPassportError(null);
  };

  const applyComplianceFile = (file) => {
    if (!file) return;
    if (!isAcceptedFileType(file)) {
      setComplianceError("Unsupported file type. Please upload a JPG, PNG or PDF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setComplianceError("File exceeds the 10MB limit. Please choose a smaller file.");
      return;
    }
    setComplianceError(null);
    setComplianceDoc({ name: file.name, size: file.size });
  };

  const handleComplianceSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    applyComplianceFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    applyComplianceFile(file);
  };

  const handleSelectWorkAuthType = (value) => { setWorkAuthType(value); setDropdownOpen(false); };
  const handleFileRemove = () => { setComplianceDoc(null); setComplianceError(null); };

  const canContinueStep1 = uaePassLinked;
  const canContinueStep2 = emiratesDigits.length === 15 && Boolean(passportFile);
  const canSubmitStep3 = Boolean(workAuthType) && Boolean(complianceDoc);
  const canProceed = currentStep === 1 ? canContinueStep1 : currentStep === 2 ? canContinueStep2 : canSubmitStep3;

  const handleBack = () => setCurrentStep((s) => Math.max(1, s - 1));
  const handleNext = () => setCurrentStep((s) => Math.min(3, s + 1));
  const handleSubmitForVetting = () => { setSubmitProgress(0); setSubmissionPhase("submitting"); };

  const handleReset = () => {
    setCurrentStep(1);
    setUaePassLinked(false);
    setUaePassLoading(false);
    setEmiratesDigits("");
    setPassportFile(null);
    setPassportError(null);
    setWorkAuthType("");
    setDropdownOpen(false);
    setComplianceDoc(null);
    setComplianceError(null);
    setIsDragging(false);
    setSubmissionPhase("idle");
    setSubmitProgress(0);
    setVerificationId("");
    setVerificationDate("");
    setVerified(false);
  };

  const handleEnterDashboard = () => {
    setVerified(true);
    setShowOnboarding(false);
    setActiveTab("home");
    setToast("Welcome to your Talent Pass hub");
  };

  const handleOpenOnboarding = () => setShowOnboarding(true);
  const handleCloseOnboarding = () => setShowOnboarding(false);

  /* ---- dashboard handlers ---- */
  const handleAcceptRequest = (id) => {
    if (!verified) {
      setToast("Complete talent verification to accept paid gigs");
      setShowOnboarding(true);
      return;
    }
    const req = gigRequests.find((r) => r.id === id);
    if (!req) return;
    setGigRequests((prev) => prev.filter((r) => r.id !== id));
    setBookings((prev) => [
      { id: req.id, event: req.event, venue: req.venue, date: req.date, time: req.time, payout: req.rate, lat: req.lat, lng: req.lng },
      ...prev,
    ]);
    const isNewVenue = !workedVenues.includes(req.venue);
    if (isNewVenue) {
      const nextVenues = [...workedVenues, req.venue];
      const crossedThreshold = nextVenues.length >= MILESTONE_TARGETS.independentAgentVenues && workedVenues.length < MILESTONE_TARGETS.independentAgentVenues;
      setWorkedVenues(nextVenues);
      if (crossedThreshold) {
        setToast("Gig accepted - Independent Agent unlocked! Free Agent badge is live.");
        return;
      }
    }
    setToast(`Gig accepted: ${req.event}`);
  };

  const handleDeclineRequest = (id) => {
    const req = gigRequests.find((r) => r.id === id);
    setGigRequests((prev) => prev.filter((r) => r.id !== id));
    if (req) setToast(`Declined: ${req.event}`);
  };

  const handleClaimRestReward = () => {
    setWalletBalance((prev) => prev + REST_REWARD_STIPEND_AED);
    setWeeksActiveStreak((prev) => Math.max(0, prev - MILESTONE_TARGETS.restRewardWeeks));
    setToast(`Rest Reward claimed - +${fmtAEDRound(REST_REWARD_STIPEND_AED)} added. Enjoy your weekend.`);
  };

  const handleSelectVote = (id) => {
    if (!vibePioneerUnlocked) return;
    setVoteSelectedId(id);
    setToast("Your vote has been recorded");
  };

  const handleClaimSlot = (id) => {
    if (!vibePioneerUnlocked || claimedSlotIds.includes(id)) return;
    setClaimedSlotIds((prev) => [...prev, id]);
    const slot = HEADLINE_SLOTS.find((s) => s.id === id);
    setToast(slot ? `Headline slot claimed: ${slot.event}` : "Headline slot claimed");
  };

  const handleToggleMentorship = (v) => setMentorshipEnabled(v);

  const handleEpkChangeField = (field, value) => setEpk((prev) => ({ ...prev, [field]: value }));
  const handleEpkToggleGenre = (g) =>
    setEpk((prev) => ({ ...prev, genres: prev.genres.includes(g) ? prev.genres.filter((x) => x !== g) : [...prev.genres, g] }));
  const handleSaveEpk = () => setToast(epk.visible ? "Press kit saved - visible to promoters" : "Press kit saved - hidden from promoters");

  const handleShareCard = (card) => { setShareCard(card); setActiveSheet("share"); };
  const handleCloseSheet = () => { setActiveSheet(null); setShareCard(null); };

  const handleRedeemCredit = (item) => {
    if (redeemedCreditIds.includes(item.id) || vibeCredits < item.cost) return;
    setVibeCredits((prev) => prev - item.cost);
    setRedeemedCreditIds((prev) => [...prev, item.id]);
    setToast(`Redeemed: ${item.label}`);
  };

  const handleOpenCashOut = () => {
    if (!verified) {
      setToast("Complete talent verification to cash out");
      setShowOnboarding(true);
      return;
    }
    if (walletBalance <= 0) return;
    setActiveSheet("cashout");
  };
  const handleCashOutComplete = () => setWalletBalance(0);

  /* Swipe left/right cycles through this hub's own 5 tabs (Home,
     Bookings, Portfolio, Wallet, Profile), in order - same mechanics
     as ConsumerHub and TrendingModule: 60px threshold, a mostly-
     vertical gesture is ignored so normal scrolling isn't mistaken
     for a tab swipe, bounded at each end. Scoped to the dashboard's
     own <main>, not the separate full-screen onboarding wizard, which
     renders exclusively of this when showOnboarding is true. */
  const tabTouchStartRef = useRef(null);
  const handleTabTouchStart = useCallback((e) => {
    const t = e.touches[0];
    tabTouchStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      /* Leaflet reads a horizontal drag as a pan, so a gesture that begins on
      the map belongs to the map. One starting on the header, the filter chips
      or the caption underneath is still a tab swipe — hence tracking where the
      touch started rather than disabling the gesture for the whole Map tab. */
      onMap: Boolean(t.target && t.target.closest && t.target.closest(".leaflet-container")),
    };
  }, []);
  const handleTabTouchEnd = useCallback(
    (e) => {
      const start = tabTouchStartRef.current;
      tabTouchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const SWIPE_THRESHOLD = 60;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const order = TALENT_NAV_ITEMS.map((it) => it.id);
      const currentIndex = order.indexOf(activeTab);
      const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= 0 && nextIndex < order.length) setActiveTab(order[nextIndex]);
    },
    [activeTab]
  );

  /* Swipe tutorial - same trigger pattern as ConsumerHub, with one
     addition: also waits for the verification wizard to not be
     showing, since TalentBottomNav itself is gated the same way
     (!showOnboarding) and there's nothing swipeable to teach while
     the wizard is up. showOnboarding is in the dependency array so
     this correctly re-evaluates once the wizard completes, not just
     when isActiveHub changes. */
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const swipeTutorialTriggeredRef = useRef(false);
  useEffect(() => {
    if (isActiveHub && !showOnboarding && !swipeTutorialTriggeredRef.current) {
      swipeTutorialTriggeredRef.current = true;
      const t = setTimeout(() => setShowSwipeTutorial(true), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isActiveHub, showOnboarding]);

  return (
    <>
          {toast && (
            <div className="absolute left-0 right-0 top-10 flex justify-center px-6" style={{ zIndex: 1450 }}>
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2 text-center text-xs font-semibold"
                style={{
                  background: "rgba(17,19,24,0.96)",
                  border: "1px solid rgba(34,197,94,0.4)",
                  color: C.textHi,
                  animation: "vpToast 2.8s ease forwards",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                <BadgeCheck size={13} color={C.emerald} />
                {toast}
              </div>
            </div>
          )}
          <main
            className="relative flex-1 overflow-y-auto vp-noscroll pb-6"
            style={{ zIndex: 2 }}
            onTouchStart={handleTabTouchStart}
            onTouchEnd={handleTabTouchEnd}
          >
            {!verified && <VerificationBanner onVerify={handleOpenOnboarding} />}
            {activeTab === "home" && (
              <HomeView
                distinctVenues={distinctVenues}
                freeAgentUnlocked={freeAgentUnlocked}
                vibePioneerStreak={vibePioneerStreak}
                vibePioneerUnlocked={vibePioneerUnlocked}
                tenureMonths={tenureMonths}
                mentorshipUnlocked={mentorshipUnlocked}
                latestDividend={latestDividend}
                weeksActiveStreak={weeksActiveStreak}
                onClaimRestReward={handleClaimRestReward}
                vibeCredits={vibeCredits}
                onOpenMilestones={() => setActiveSheet("milestones")}
                onOpenWallet={() => setActiveTab("wallet")}
                onOpenCredits={() => setActiveTab("wallet")}
              />
            )}
            {activeTab === "bookings" && (
              <BookingsView requests={gigRequests} bookings={upcomingBookings} onAccept={handleAcceptRequest} onDecline={handleDeclineRequest} />
            )}
            {activeTab === "portfolio" && (
              <PortfolioView
                epk={epk}
                onChangeField={handleEpkChangeField}
                onToggleGenre={handleEpkToggleGenre}
                onSaveEpk={handleSaveEpk}
                freeAgentUnlocked={freeAgentUnlocked}
                portfolio={portfolioCards}
                onShareCard={handleShareCard}
              />
            )}
            {activeTab === "wallet" && (
              <TalentWalletView
                walletBalance={walletBalance}
                weeklyGigs={weeklyGigs}
                feeFreeTarget={MILESTONE_TARGETS.feeFreeGigs}
                onOpenCashOut={handleOpenCashOut}
                verified={verified}
                dividends={dividends}
                credits={vibeCredits}
                redeemedIds={redeemedCreditIds}
                onRedeem={handleRedeemCredit}
                tips={tips}
                payouts={payouts}
              />
            )}
            {activeTab === "profile" && (
              <TalentProfileView
                verified={verified}
                verificationId={verificationId}
                verificationDate={verificationDate}
                workAuthType={workAuthType}
                emiratesDigits={emiratesDigits}
                onOpenVerification={handleOpenOnboarding}
              />
            )}
          </main>

          {activeSheet === "milestones" && (
            <MilestoneDetailSheet
              onClose={() => setActiveSheet(null)}
              distinctVenues={distinctVenues}
              freeAgentUnlocked={freeAgentUnlocked}
              vibePioneerStreak={vibePioneerStreak}
              vibePioneerUnlocked={vibePioneerUnlocked}
              communityVote={communityVote}
              onSelectVote={handleSelectVote}
              headlineSlots={HEADLINE_SLOTS}
              claimedSlotIds={claimedSlotIds}
              onClaimSlot={handleClaimSlot}
              tenureMonths={tenureMonths}
              mentorshipUnlocked={mentorshipUnlocked}
              mentees={SEED_MENTEES}
              mentorshipEnabled={mentorshipEnabled}
              onToggleMentorship={handleToggleMentorship}
            />
          )}
          {activeSheet === "share" && shareCard && <ShareSheet card={shareCard} onClose={handleCloseSheet} />}
          {activeSheet === "cashout" && (
            <CashOutSheet amount={walletBalance} fee={cashOutFee} onClose={() => setActiveSheet(null)} onComplete={handleCashOutComplete} />
          )}

          {showOnboarding && (
            <OnboardingOverlay
              currentStep={currentStep}
              uaePassLinked={uaePassLinked}
              uaePassLoading={uaePassLoading}
              onLink={handleUaePassLink}
              emiratesDigits={emiratesDigits}
              onEmiratesChange={handleEmiratesChange}
              passportFile={passportFile}
              onPassportPick={handlePassportPick}
              onPassportRemove={handlePassportRemove}
              passportInputRef={passportInputRef}
              passportError={passportError}
              workAuthType={workAuthType}
              onSelectType={handleSelectWorkAuthType}
              dropdownOpen={dropdownOpen}
              onToggleDropdown={() => setDropdownOpen((o) => !o)}
              complianceDoc={complianceDoc}
              onFileSelect={handleComplianceSelect}
              onFileRemove={handleFileRemove}
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              fileInputRef={complianceInputRef}
              complianceError={complianceError}
              dropdownRef={dropdownRef}
              submissionPhase={submissionPhase}
              submitProgress={submitProgress}
              verificationId={verificationId}
              verificationDate={verificationDate}
              canProceed={canProceed}
              onBack={handleBack}
              onNext={handleNext}
              onSubmitForVetting={handleSubmitForVetting}
              onReset={handleReset}
              onClose={handleCloseOnboarding}
              onEnterDashboard={handleEnterDashboard}
            />
          )}

          {!showOnboarding && <TalentBottomNav tab={activeTab} setTab={setActiveTab} requestCount={gigRequests.length} />}
          {showSwipeTutorial && !showOnboarding && (
            <SwipeTutorialOverlay
              onDismiss={() => setShowSwipeTutorial(false)}
              tabLabels={TALENT_NAV_ITEMS.map((it) => it.label)}
              tokens={{ surface: C.surface, line: C.line, textHi: C.textHi, textMid: C.textMid, accent: C.emerald, accentText: "#052E16" }}
            />
          )}
    </>
  );
}

/* ================================================================
   PROMOTER HUB — Enterprise Controller
   Uploaded as VibePassEnterpriseController.jsx and integrated here
   as the third role-gated hub. Its own const C was renamed to PC
   throughout (146 usages) - the two token sets share bg/emerald/
   amethyst hex values but differ on surface/border, so unifying
   them risked a subtle color-shift regression for no real gain.
   Every other top-level name was checked against the rest of this
   file and is collision-free. Internal structure (Hub/Console view,
   HubTabs, the applicant-review sheet) is otherwise unchanged.
   ================================================================ */

// ---- Brand tokens (exact corporate hex values, applied via inline style
// so they render pixel-perfect regardless of the Tailwind build) ----
const PC = {
  bg: '#0A0A0C', // Midnight Obsidian
  surface: '#131316',
  surfaceAlt: '#18181C',
  /* Kept in step with C.line above — the promoter hub is the same product
     and looked flatter than the rest once the others gained an edge. */
  border: '#383842',
  emerald: '#22C55E', // Electric Emerald
  amethyst: '#A855F7', // Neon Amethyst
};

const SHIFT_ICONS = {
  Mixologist: Wine,
  'Live DJ': Music,
  'Security Detail': ShieldAlert,
  'Head Barista': Coffee,
  'Floor Supervisor': Users,
};

function createDefaultOpenSlots() {
  return [{ id: 'slot-1', role: 'Live DJ', hourlyRate: '220' }];
}

// ---- Static reference data for every property this organizer manages.
// This never mutates. Live, editable state for each property (tickets,
// GMV, shifts, applicants, escrow) is held separately in propertyStates
// below, seeded from here once, so progress isn't lost when navigating
// back to the Hub and into a different property. ----
const ORGANIZER_PROPERTIES = [
  {
    id: 'prop-1',
    name: 'Amethyst Nights — Live',
    type: 'Event',
    category: 'Concert & Arena',
    venue: 'Etihad Arena',
    zone: 'VIP Lounge & Main Stage',
    date: nextWeekdayLabel(5, 1),
    time: '7:00 PM – 2:00 AM',
    dctPermit: 'AD-2026-77419',
    capacity: 8000,
    followerReach: 12400,
    initialTickets: 4218,
    ticketPrice: 340,
    initialEscrow: 212500,
    shifts: [
      { id: 'sh1', role: 'Mixologist', venue: 'Etihad Arena', zone: 'VIP Lounge', date: nextWeekdayLabel(5, 1), time: '7:00 PM – 1:00 AM', needed: 3, filled: 1, urgency: 'high' },
      { id: 'sh2', role: 'Live DJ', venue: 'Etihad Arena', zone: 'Main Stage', date: nextWeekdayLabel(5, 1), time: '9:00 PM – 12:30 AM', needed: 1, filled: 0, urgency: 'critical' },
      { id: 'sh3', role: 'Security Detail', venue: 'Etihad Arena', zone: 'Perimeter', date: nextWeekdayLabel(5, 1), time: '5:00 PM – 2:00 AM', needed: 4, filled: 2, urgency: 'medium' },
    ],
    applicants: [
      { id: 'a1', name: 'Fatima Al Suwaidi', role: 'Mixologist', shiftId: 'sh1', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', rating: 4.9, completedGigs: 62, rateAED: 85, estHours: 6, emiratesIdVerified: true, mohrePermitActive: true, verified: true, status: 'pending' },
      { id: 'a2', name: 'Rohan Mehta', role: 'Live DJ', shiftId: 'sh2', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', rating: 4.8, completedGigs: 138, rateAED: 220, estHours: 4, emiratesIdVerified: true, mohrePermitActive: true, verified: true, status: 'pending' },
      { id: 'a3', name: 'Youssef El-Amin', role: 'Security Detail', shiftId: 'sh3', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', rating: 4.7, completedGigs: 94, rateAED: 65, estHours: 9, emiratesIdVerified: true, mohrePermitActive: true, verified: true, status: 'pending' },
      { id: 'a4', name: 'Chen Wei', role: 'Mixologist', shiftId: 'sh1', photo: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', rating: 4.6, completedGigs: 41, rateAED: 80, estHours: 6, emiratesIdVerified: true, mohrePermitActive: true, verified: true, status: 'pending' },
      { id: 'a5', name: 'Amara Okonkwo', role: 'Security Detail', shiftId: 'sh3', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', rating: 4.9, completedGigs: 77, rateAED: 68, estHours: 9, emiratesIdVerified: true, mohrePermitActive: true, verified: true, status: 'pending' },
      { id: 'a6', name: 'Karan Malhotra', role: 'Security Detail', shiftId: 'sh3', photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', rating: 4.5, completedGigs: 19, rateAED: 60, estHours: 9, emiratesIdVerified: true, mohrePermitActive: false, verified: false, status: 'pending' },
    ],
    topSupporters: [
      { id: 'sup1', name: 'Layla Haddad', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 14, sharesCount: 22, earlyBirdTier: 'Top 1%', spendAED: 4760, vipStatus: null },
      { id: 'sup2', name: 'Omar Farouk', photo: 'https://images.unsplash.com/photo-1489980557514-251d61e3eeb6?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 11, sharesCount: 8, earlyBirdTier: 'Top 3%', spendAED: 3740, vipStatus: null },
      { id: 'sup3', name: 'Priya Nair', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 9, sharesCount: 31, earlyBirdTier: 'Top 5%', spendAED: 3060, vipStatus: 'fast-track' },
      { id: 'sup4', name: 'Daniel Wren', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 7, sharesCount: 4, earlyBirdTier: 'Top 12%', spendAED: 2380, vipStatus: null },
      { id: 'sup5', name: 'Sara Ibrahim', photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 6, sharesCount: 15, earlyBirdTier: 'Top 8%', spendAED: 2040, vipStatus: null },
    ],
    announcements: [
      { id: 'ann-seed-1', title: 'Early lineup reveal', message: 'Our headline DJ just confirmed three exclusive tracks for the VIP set. Followers get first access to Platinum upgrades before we open them publicly.', audience: 'followers', preSaleAttached: true, preSaleCode: 'PRESALE-9F21K', sentAt: '2 days ago' },
    ],
  },
  {
    id: 'prop-2',
    name: 'The Obsidian Brew Bar',
    type: 'Cafe/Bar',
    category: 'Symphony & Specialty',
    venue: 'Marina Mall Walk',
    zone: 'Espresso Terrace',
    date: 'Daily Operation',
    time: '8:00 AM – Midnight',
    dctPermit: 'AD-2026-CAF902',
    capacity: 250,
    followerReach: 2150,
    initialTickets: 180,
    ticketPrice: 45,
    initialEscrow: 48000,
    shifts: [
      { id: 'sh4', role: 'Head Barista', venue: 'Marina Mall Walk', zone: 'Espresso Bar', date: nextWeekdayLabel(6, 1), time: '8:00 AM – 4:00 PM', needed: 2, filled: 1, urgency: 'high' },
      { id: 'sh5', role: 'Floor Supervisor', venue: 'Marina Mall Walk', zone: 'Terrace', date: nextWeekdayLabel(6, 1), time: '12:00 PM – 8:00 PM', needed: 1, filled: 1, urgency: 'medium' },
    ],
    applicants: [
      { id: 'a7', name: 'Elena Rostova', role: 'Head Barista', shiftId: 'sh4', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', rating: 4.9, completedGigs: 210, rateAED: 90, estHours: 8, emiratesIdVerified: true, mohrePermitActive: true, verified: true, status: 'pending' },
    ],
    topSupporters: [
      { id: 'sup6', name: 'Noura Al Zaabi', photo: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 28, sharesCount: 5, earlyBirdTier: 'Regular', spendAED: 1260, vipStatus: null },
      { id: 'sup7', name: 'Tom Bradley', photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 19, sharesCount: 2, earlyBirdTier: 'Regular', spendAED: 855, vipStatus: null },
      { id: 'sup8', name: 'Mei Lin', photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 15, sharesCount: 9, earlyBirdTier: 'Regular', spendAED: 675, vipStatus: 'fast-track' },
    ],
    announcements: [
      { id: 'ann-seed-2', title: 'New seasonal roast dropping', message: 'Our single-origin Ethiopian roast launches this weekend. Regulars get 15% off the first pour.', audience: 'followers', preSaleAttached: false, preSaleCode: null, sentAt: '5 days ago' },
    ],
  },
  {
    id: 'prop-3',
    name: 'Soho Club Lounge',
    type: 'Club/Lounge',
    category: 'Vibrant Nightlife',
    venue: 'Yas Island',
    zone: 'VIP Deck',
    date: 'Thu - Sat Nights',
    time: '10:00 PM – 4:00 AM',
    dctPermit: 'AD-2026-NIGHT04',
    capacity: 1200,
    followerReach: 6800,
    initialTickets: 940,
    ticketPrice: 200,
    initialEscrow: 160000,
    shifts: [
      { id: 'sh6', role: 'Mixologist', venue: 'Yas Island', zone: 'VIP Deck', date: nextWeekdayLabel(6, 1), time: '10:00 PM – 4:00 AM', needed: 4, filled: 2, urgency: 'critical' },
      { id: 'sh7', role: 'Security Detail', venue: 'Yas Island', zone: 'Entry Lobby', date: nextWeekdayLabel(6, 1), time: '9:00 PM – 5:00 AM', needed: 6, filled: 5, urgency: 'high' },
    ],
    applicants: [
      { id: 'a8', name: 'Marcus Sterling', role: 'Mixologist', shiftId: 'sh6', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', rating: 4.8, completedGigs: 85, rateAED: 95, estHours: 6, emiratesIdVerified: true, mohrePermitActive: true, verified: true, status: 'pending' },
    ],
    topSupporters: [
      { id: 'sup9', name: 'Zayd Qureshi', photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 12, sharesCount: 18, earlyBirdTier: 'Top 2%', spendAED: 2400, vipStatus: null },
      { id: 'sup10', name: 'Isabella Conti', photo: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 10, sharesCount: 6, earlyBirdTier: 'Top 6%', spendAED: 2000, vipStatus: null },
      { id: 'sup11', name: 'Hassan Idris', photo: 'https://images.unsplash.com/photo-1546456073-92b9f0a8d413?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 8, sharesCount: 12, earlyBirdTier: 'Top 9%', spendAED: 1600, vipStatus: null },
      { id: 'sup12', name: 'Grace Adeyemi', photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80', ticketsPurchased: 6, sharesCount: 3, earlyBirdTier: 'Top 15%', spendAED: 1200, vipStatus: null },
    ],
    announcements: [
      { id: 'ann-seed-3', title: 'Saturday residency announced', message: 'A six-week Saturday residency is locked in. Followers can reserve VIP Deck tables before the public waitlist opens.', audience: 'followers', preSaleAttached: true, preSaleCode: 'PRESALE-3M8QZ', sentAt: '1 day ago' },
    ],
  },
];

// ---- Promoter Network: peer organizers this operator follows, is
// followed by, or has been suggested to connect with. Purely a
// relationship/discovery layer — no financial or staffing figures live
// here, unlike ORGANIZER_PROPERTIES above. ----
const PROMOTER_NETWORK = [
  {
    id: 'net-1',
    name: 'Oasis Nights Collective',
    category: 'Nightlife & Live Music',
    zone: 'Al Maryah Island',
    followers: 18400,
    mutualCollabs: 4,
    relationship: 'mutual',
    trending: true,
    activity: 'Just booked a 3-night residency at Yas Bay — 92% sell-through in 48 hours.',
  },
  {
    id: 'net-2',
    name: 'Desert Bloom Festivals',
    category: 'Concerts & Festivals',
    zone: 'Al Ain',
    followers: 31200,
    mutualCollabs: 1,
    relationship: 'following',
    trending: true,
    activity: 'Announced their winter festival lineup — pre-sale opens next week.',
  },
  {
    id: 'net-3',
    name: 'Marina Social Group',
    category: 'Dining & Café Venues',
    zone: 'Yas Marina',
    followers: 6100,
    mutualCollabs: 0,
    relationship: 'suggested',
    trending: false,
    activity: 'Opened a second waterfront location this month.',
  },
  {
    id: 'net-4',
    name: 'Corniche Live Presents',
    category: 'Concerts & Festivals',
    zone: 'Corniche',
    followers: 22750,
    mutualCollabs: 2,
    relationship: 'mutual',
    trending: false,
    activity: 'Cross-promoted your Amethyst Nights event to their list last quarter.',
  },
  {
    id: 'net-5',
    name: 'Yas Creative House',
    category: 'E-Sports & Theater',
    zone: 'Yas Island',
    followers: 9840,
    mutualCollabs: 0,
    relationship: 'following',
    trending: false,
    activity: 'Building out a new esports arena and hiring staff now.',
  },
];

// ---- Follower Milestones: an aggregate-follower reward ladder for the
// whole organization (Falcon Hospitality Group), spanning every managed
// property. Rungs are ordered ascending; "achieved" is derived at render
// time by comparing each threshold against the live orgFollowers count
// in state. ----
const FOLLOWER_MILESTONES = [
  { id: 'ms-1000', threshold: 1000, label: 'Community Seed', reward: 'Custom discount code pack unlocked for your properties.' },
  { id: 'ms-2500', threshold: 2500, label: 'Rising Voice', reward: 'Priority placement in the in-app "Trending Promoters" carousel.' },
  { id: 'ms-5000', threshold: 5000, label: 'Featured Promoter', reward: 'Featured spot on the main Vibe Pass discovery page for 7 days.' },
  { id: 'ms-10000', threshold: 10000, label: 'Network Anchor', reward: 'Direct co-marketing slot with the Vibe Pass editorial team.' },
  { id: 'ms-25000', threshold: 25000, label: 'Capital Icon', reward: 'Dedicated account manager and waived platform fees for one quarter.' },
];

const ORG_FOLLOWERS_SEED = 4820;

// Builds the live-state slice for every property once, from the static
// reference data above. Runs a single time via useState's lazy
// initializer, so the random trend seeds aren't recomputed every render.
function createInitialPropertyStates() {
  const map = {};
  ORGANIZER_PROPERTIES.forEach((property) => {
    map[property.id] = {
      ticketsSold: property.initialTickets,
      gmv: property.initialTickets * property.ticketPrice,
      shifts: property.shifts,
      applicants: property.applicants,
      topSupporters: property.topSupporters,
      announcements: property.announcements,
      escrowLocked: property.initialEscrow,
      trend: Array.from({ length: 14 }, (_, i) => ({ i, v: 15 + Math.random() * 45 })),
    };
  });
  return map;
}

function formatAED(n) {
  return `AED ${Math.round(n).toLocaleString('en-US')}`;
}

function formatNum(n) {
  return Math.round(n).toLocaleString('en-US');
}

/* Converts a native <input type="date"> value ("2026-08-26") into this
   app's existing display format ("Wed, 26 Aug 2026"), matching every
   seeded event/property date string already on screen. The T00:00:00
   suffix keeps the parse in local time - without it, bare YYYY-MM-DD
   strings parse as UTC midnight and can display as the previous day
   in negative-UTC timezones. */
function formatPostedDate(isoDateStr) {
  if (!isoDateStr) return '';
  const d = new Date(`${isoDateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDateStr;
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday}, ${d.getDate()} ${month} ${d.getFullYear()}`;
}

function StarRow({ rating }) {
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={13}
          className={i < filled ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'}
        />
      ))}
    </div>
  );
}

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2';

const PROMOTER_HUB_TABS = [
  { id: 'properties', label: 'Properties' },
  { id: 'community', label: 'Community' },
  { id: 'talent-search', label: 'Talent Search' },
  { id: 'profile', label: 'Profile' },
];

function HubTabs({ value, onChange }) {
  const tabs = PROMOTER_HUB_TABS;
  return (
    <div
      role="tablist"
      aria-label="Hub sections"
      className="flex gap-1.5 rounded-2xl p-1"
      style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            /* Four equal columns on a ~390px screen leave roughly 90px each,
               and "TALENT SEARCH" did not fit at text-xs with wide tracking,
               so `truncate` was clipping it. Dropping a step in size and
               tracking makes the longest label fit; `truncate` is gone so a
               label can never silently lose characters again. */
            className={`flex-1 rounded-xl px-1 py-2 text-[10px] font-bold uppercase leading-tight transition-all active:scale-95 ${active ? '' : 'text-neutral-500'} ${FOCUS_RING}`}
            style={
              active
                ? { backgroundColor: 'rgba(168,85,247,0.14)', color: PC.amethyst, border: `1px solid ${PC.amethyst}` }
                : { border: '1px solid transparent' }
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* Talent Search tab (Nav-8) - browsing TALENT_ROSTER (Nav-5), not a
   bare text box: category chips let a promoter browse by specialty
   without typing anything. Chips are derived from the categories
   actually present in TALENT_ROSTER, not the full FILTERS list -
   showing a chip for a category with zero talent would be a dead
   end. Uses PC.amethyst for the rating star rather than importing
   C.gold from the other token system; PromoterHub has never used a
   third accent color anywhere else. */
function PromoterTalentSearchView({ onMessage }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  /* Shortlist (Nav-9, suggestion 3) - viewMode toggles between the
     normal search+filter browse experience and a view of only the
     bookmarked talent. Shortlist mode intentionally ignores query/
     category, since it represents an already-curated small set the
     promoter built themselves, not something to filter further.
     shortlistedIds is a Set (matching the visitedHubs pattern used
     elsewhere in this app for membership tracking), rebuilt on every
     toggle rather than mutated in place, so React's change detection
     picks it up correctly. */
  const [viewMode, setViewMode] = useState('browse'); // 'browse' | 'shortlist'
  const [shortlistedIds, setShortlistedIds] = useState(() => new Set());

  const toggleShortlist = useCallback((talentId) => {
    setShortlistedIds((prev) => {
      const next = new Set(prev);
      if (next.has(talentId)) next.delete(talentId);
      else next.add(talentId);
      return next;
    });
  }, []);

  const categories = useMemo(() => ['all', ...new Set(TALENT_ROSTER.map((t) => t.category))], []);

  const browseResults = useMemo(() => {
    let list = TALENT_ROSTER;
    if (activeCategory !== 'all') list = list.filter((t) => t.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const hay = [t.name, t.specialty, t.category, t.basedIn, t.bio].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [query, activeCategory]);

  const shortlistResults = useMemo(
    () => TALENT_ROSTER.filter((t) => shortlistedIds.has(t.id)),
    [shortlistedIds]
  );

  const results = viewMode === 'shortlist' ? shortlistResults : browseResults;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Browse Talent</h3>
        <div className="flex rounded-full p-0.5" style={{ backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.border}` }}>
          {[
            { id: 'browse', label: 'Browse' },
            { id: 'shortlist', label: `Shortlist (${shortlistedIds.size})` },
          ].map((m) => {
            const active = viewMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setViewMode(m.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${FOCUS_RING}`}
                style={
                  active
                    ? { backgroundColor: 'rgba(168,85,247,0.14)', color: PC.amethyst, border: `1px solid ${PC.amethyst}` }
                    : { color: '#6B7280', border: '1px solid transparent' }
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      {viewMode === 'browse' && (
        <>
          <div
            className="flex items-center gap-2 rounded-full border p-1.5 mb-3"
            style={{ borderColor: PC.border, backgroundColor: PC.surface }}
          >
            <Search size={16} className="text-neutral-500 ml-2 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, specialty, or city..."
              className="w-full bg-transparent text-sm outline-none text-white placeholder-neutral-600"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              const label = cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95 ${FOCUS_RING}`}
                  style={
                    active
                      ? { background: PC.amethyst, color: '#1A0B2E' }
                      : { background: PC.surfaceAlt, color: '#9CA3AF', border: `1px solid ${PC.border}` }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </>
      )}
      {results.length === 0 ? (
        <div
          className="rounded-2xl border px-6 py-8 text-center"
          style={{ borderColor: PC.border, backgroundColor: PC.surface }}
        >
          <p className="text-sm font-semibold text-white">
            {viewMode === 'shortlist' ? 'Your shortlist is empty' : 'No talent found'}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {viewMode === 'shortlist'
              ? 'Bookmark talent while browsing to build a shortlist for an upcoming event.'
              : 'Try a different search or category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {results.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl p-3.5 border"
              style={{ backgroundColor: PC.surface, borderColor: PC.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${PC.amethyst}, ${PC.emerald})`, color: '#0A0A0C' }}
                >
                  {t.avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{t.name}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {t.specialty} &middot; {t.basedIn}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Star size={12} fill={PC.amethyst} color={PC.amethyst} />
                  <span className="text-xs font-bold text-white">{t.rating.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-2">{t.bio}</p>
              <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-xs font-semibold" style={{ color: PC.emerald }}>
                  From {fmtAED(t.ratePerEvent)}/event
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleShortlist(t.id)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full active:scale-95 transition-transform ${FOCUS_RING}`}
                    style={
                      shortlistedIds.has(t.id)
                        ? { backgroundColor: 'rgba(168,85,247,0.2)', border: `1px solid ${PC.amethyst}` }
                        : { backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.border}` }
                    }
                    aria-label={shortlistedIds.has(t.id) ? `Remove ${t.name} from shortlist` : `Add ${t.name} to shortlist`}
                  >
                    <Bookmark
                      size={12}
                      fill={shortlistedIds.has(t.id) ? PC.amethyst : 'none'}
                      color={shortlistedIds.has(t.id) ? PC.amethyst : '#9CA3AF'}
                    />
                  </button>
                  <button
                    onClick={() => onMessage(t)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold active:scale-95 transition-transform ${FOCUS_RING}`}
                    style={{ backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.border}`, color: '#E5E7EB' }}
                  >
                    <MessageCircle size={12} />
                    Message
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Profile tab (Nav-8) - PromoterHub's identity was previously shown
   only as a small header card ("Falcon Hospitality Group, 3 active
   locations"), never a dedicated tab. Matches ConsumerProfileView's
   established avatar + verified badge + row-list pattern, using
   PROMOTER_MOCK_PROFILE's real registration data rather than
   inventing new fields. */
function PromoterProfileView() {
  const rows = [
    { icon: <Building2 size={16} style={{ color: PC.amethyst }} />, label: 'Business Name', value: PROMOTER_MOCK_PROFILE.businessName },
    { icon: <User size={16} style={{ color: PC.amethyst }} />, label: 'Contact Name', value: PROMOTER_MOCK_PROFILE.contactName },
    { icon: <Mail size={16} style={{ color: PC.amethyst }} />, label: 'Contact Email', value: PROMOTER_MOCK_PROFILE.contactEmail },
    { icon: <Phone size={16} style={{ color: PC.amethyst }} />, label: 'Contact Phone', value: PROMOTER_MOCK_PROFILE.contactPhone },
    { icon: <ShieldCheck size={16} style={{ color: PC.emerald }} />, label: 'DCT Permit', value: PROMOTER_MOCK_PROFILE.permitNumber },
  ];

  return (
    <div>
      <div className="flex flex-col items-center py-2">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
          style={{ backgroundImage: `linear-gradient(135deg, ${PC.amethyst}, ${PC.emerald})`, color: '#0A0A0C' }}
        >
          {PROMOTER_MOCK_PROFILE.businessName.charAt(0)}
        </div>
        <p className="mt-3 text-lg font-bold text-white">{PROMOTER_MOCK_PROFILE.businessName}</p>
        <span
          className="mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
          style={{ background: 'rgba(34,197,94,0.12)', color: PC.emerald }}
        >
          <BadgeCheck size={11} /> DCT Verified
        </span>
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border" style={{ borderColor: PC.border, backgroundColor: PC.surface }}>
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderTop: i === 0 ? 'none' : `1px solid ${PC.border}` }}
          >
            {r.icon}
            <span className="flex-1 text-sm text-white">{r.label}</span>
            <span className="text-xs font-medium text-neutral-400">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-neutral-600">Epicenter Technologies LTD Vibe Pass v2.8.0</p>
      <p className="mt-1 text-center text-xs text-neutral-600">Events ticketing regulated under DCT Abu Dhabi.</p>
    </div>
  );
}

/* Cross-Property Analytics Rollup (Nav-9, suggestion 4) - the data for
   this already existed (propertyStates tracks GMV/tickets/shifts per
   property, ORGANIZER_PROPERTIES has each property's capacity), it
   was just never aggregated. Rendered above the property list in the
   Properties tab, so a promoter running 3+ venues sees the portfolio
   total before drilling into any single Console. Reuses the existing
   generic ProgressBar component with explicit PC colors rather than
   adding new recharts chart types - lower risk than introducing bar
   charts for one section, and this app already has a proven pattern
   for "value out of max" visualization. */
function PortfolioRollupSection({ properties, propertyStates }) {
  const rollup = useMemo(() => {
    let totalGmv = 0;
    let totalTicketsSold = 0;
    let totalCapacity = 0;
    let totalShiftsNeeded = 0;
    let totalShiftsFilled = 0;
    let totalEscrow = 0;

    properties.forEach((property) => {
      const state = propertyStates[property.id];
      if (!state) return;
      totalGmv += state.gmv;
      totalTicketsSold += state.ticketsSold;
      totalCapacity += property.capacity;
      totalEscrow += state.escrowLocked;
      state.shifts.forEach((shift) => {
        totalShiftsNeeded += shift.needed;
        totalShiftsFilled += shift.filled;
      });
    });

    const sellThroughPct = totalCapacity > 0 ? (totalTicketsSold / totalCapacity) * 100 : 0;
    const staffingFillPct = totalShiftsNeeded > 0 ? (totalShiftsFilled / totalShiftsNeeded) * 100 : 0;

    const byProperty = properties
      .map((property) => {
        const state = propertyStates[property.id];
        return {
          id: property.id,
          name: property.name,
          gmv: state ? state.gmv : 0,
          sellThroughPct: state && property.capacity > 0 ? (state.ticketsSold / property.capacity) * 100 : 0,
        };
      })
      .sort((a, b) => b.gmv - a.gmv);

    return { totalGmv, totalTicketsSold, totalCapacity, sellThroughPct, staffingFillPct, totalEscrow, byProperty };
  }, [properties, propertyStates]);

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={14} style={{ color: PC.emerald }} />
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Portfolio Overview</h2>
      </div>
      <p className="text-xs text-neutral-600 mb-3">Rolled up across all {properties.length} properties.</p>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="rounded-2xl p-3.5" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Total GMV</p>
          <p className="text-lg font-extrabold text-white mt-0.5">{formatAED(rollup.totalGmv)}</p>
        </div>
        <div className="rounded-2xl p-3.5" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Tickets Sold</p>
          <p className="text-lg font-extrabold text-white mt-0.5">{formatNum(rollup.totalTicketsSold)}</p>
        </div>
      </div>

      <div className="rounded-2xl p-3.5 mb-2.5" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-neutral-300">Sell-Through Rate</p>
          <p className="text-xs font-bold" style={{ color: PC.emerald }}>
            {rollup.sellThroughPct.toFixed(0)}%
          </p>
        </div>
        <ProgressBar value={rollup.sellThroughPct} max={100} color={PC.emerald} trackColor={PC.border} />
      </div>

      <div className="rounded-2xl p-3.5 mb-4" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-neutral-300">Staffing Fill Rate</p>
          <p className="text-xs font-bold" style={{ color: PC.amethyst }}>
            {rollup.staffingFillPct.toFixed(0)}%
          </p>
        </div>
        <ProgressBar value={rollup.staffingFillPct} max={100} color={PC.amethyst} trackColor={PC.border} />
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">GMV by Property</p>
      <div className="space-y-2">
        {rollup.byProperty.map((p) => (
          <div key={p.id} className="rounded-xl p-3" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-bold text-white truncate">{p.name}</p>
              <p className="text-xs font-mono shrink-0" style={{ color: PC.emerald }}>
                {formatAED(p.gmv)}
              </p>
            </div>
            <ProgressBar value={p.sellThroughPct} max={100} height={5} color={PC.emerald} trackColor={PC.border} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* Messaging (Nav-9, suggestion 2) - a bottom-sheet conversation rather
   than a new tab, since HubTabs is already tight with 4 labels.
   Opened from a Message action on Talent Search cards and Network
   Feed cards, both of which pass a `recipient` shaped
   {id, name, initial, subtitle, seedMessage} - a small, deliberately
   generic contract so this same sheet serves both card types without
   knowing anything about talent or promoter-network data shapes.
   Reuses the existing vpSlideUp keyframe (defined in VibePassApp's
   shared style block, available here since PromoterHub renders inside
   that same tree) rather than inventing a new animation. */
function MessageThreadSheet({ recipient, messages, onSend, onClose }) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 2400, background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-t-3xl border-t"
        style={{
          height: '75vh',
          backgroundColor: PC.bg,
          borderColor: PC.border,
          animation: 'vpSlideUp 0.3s cubic-bezier(0.2,0.9,0.3,1.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3.5" style={{ borderColor: PC.border }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: `linear-gradient(135deg, ${PC.amethyst}, ${PC.emerald})`, color: '#0A0A0C' }}
          >
            {recipient.initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{recipient.name}</p>
            <p className="text-xs text-neutral-500 truncate">{recipient.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${FOCUS_RING}`}
            style={{ backgroundColor: PC.surfaceAlt }}
            aria-label="Close"
          >
            <X size={14} className="text-neutral-400" />
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto vp-noscroll px-4 py-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="rounded-2xl px-3.5 py-2.5"
                style={
                  m.sender === 'me'
                    ? { background: PC.amethyst, color: '#1A0B2E', maxWidth: '75%' }
                    : { background: PC.surface, border: `1px solid ${PC.border}`, color: '#FFFFFF', maxWidth: '75%' }
                }
              >
                <p className="text-sm">{m.text}</p>
                <p className="mt-1 text-xs opacity-60">{m.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t p-3" style={{ borderColor: PC.border }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none text-white placeholder-neutral-600"
            style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-95 transition-transform disabled:opacity-40 ${FOCUS_RING}`}
            style={{ backgroundColor: PC.amethyst }}
            aria-label="Send message"
          >
            <Send size={16} color="#1A0B2E" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Collaboration (Nav-9, suggestion 1) - extends the 'mutual'
   relationship's existing "Propose Collab" button, which previously
   did nothing but flip networkActionSent[id] to true with zero
   substance behind it. Deliberately scoped to 'mutual' only:
   'following' already has its own, semantically different action
   (Cross-Promote - sharing/boosting, not a joint new event), left
   untouched. Split choices are three preset pills rather than a
   range input - simpler, more reliable on mobile, and consistent
   with the pill-selection pattern already used throughout this app
   (category filters, etc.) rather than introducing a new UI paradigm
   for one feature. */
const SPLIT_PRESETS = [
  { id: 'even', label: 'Even Split', you: 50, them: 50 },
  { id: 'you-lead', label: 'You Lead', you: 65, them: 35 },
  { id: 'they-lead', label: 'They Lead', you: 35, them: 65 },
];

function CollaborationSheet({ promoter, onClose, onConfirm }) {
  const [phase, setPhase] = useState('form'); // 'form' | 'sending' | 'sent' | 'confirmed'
  const [title, setTitle] = useState(`Joint event with ${promoter.name}`);
  const [splitId, setSplitId] = useState('even');
  const [note, setNote] = useState(
    `Hey! Would love to team up on something \u2014 thinking a joint night could do really well for both our audiences. Open to splitting it evenly to start.`
  );

  useEffect(() => {
    if (phase !== 'sending') return undefined;
    const t = setTimeout(() => setPhase('sent'), 1200);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'sent') return undefined;
    const t = setTimeout(() => {
      setPhase('confirmed');
      const split = SPLIT_PRESETS.find((s) => s.id === splitId);
      onConfirm({ title, split, note });
    }, 1600);
    return () => clearTimeout(t);
  }, [phase, splitId, title, note, onConfirm]);

  useEffect(() => {
    if (phase !== 'confirmed') return undefined;
    const t = setTimeout(() => onClose(), 1800);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 2400, background: 'rgba(0,0,0,0.6)' }}
      onClick={phase === 'form' ? onClose : undefined}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-t-3xl border-t"
        style={{
          maxHeight: '85vh',
          backgroundColor: PC.bg,
          borderColor: PC.border,
          animation: 'vpSlideUp 0.3s cubic-bezier(0.2,0.9,0.3,1.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'form' && (
          <>
            <div className="flex items-center gap-3 border-b px-4 py-3.5" style={{ borderColor: PC.border }}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(168,85,247,0.15)' }}
              >
                <Handshake size={16} style={{ color: PC.amethyst }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">Propose Collab</p>
                <p className="text-xs text-neutral-500 truncate">with {promoter.name}</p>
              </div>
              <button
                onClick={onClose}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${FOCUS_RING}`}
                style={{ backgroundColor: PC.surfaceAlt }}
                aria-label="Close"
              >
                <X size={14} className="text-neutral-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto vp-noscroll px-4 py-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Event / Collab Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                  style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Revenue Split
                </label>
                <div className="flex flex-col gap-2">
                  {SPLIT_PRESETS.map((s) => {
                    const active = splitId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSplitId(s.id)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-transform active:scale-95 ${FOCUS_RING}`}
                        style={
                          active
                            ? { backgroundColor: 'rgba(168,85,247,0.14)', border: `1px solid ${PC.amethyst}`, color: '#FFFFFF' }
                            : { backgroundColor: PC.surface, border: `1px solid ${PC.border}`, color: '#9CA3AF' }
                        }
                      >
                        <span className="font-semibold">{s.label}</span>
                        <span className="flex items-center gap-1 text-xs font-mono">
                          <Percent size={11} />
                          You {s.you} / Them {s.them}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none"
                  style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}
                />
              </div>
            </div>
            <div className="border-t p-4" style={{ borderColor: PC.border }}>
              <button
                onClick={() => setPhase('sending')}
                disabled={!title.trim()}
                className={`w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40 ${FOCUS_RING}`}
                style={{ backgroundColor: PC.amethyst, color: '#1A0B2E' }}
              >
                <Handshake size={15} />
                Send Proposal
              </button>
            </div>
          </>
        )}
        {(phase === 'sending' || phase === 'sent') && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Loader2 size={28} className="animate-spin" style={{ color: PC.amethyst }} />
            <p className="text-sm font-semibold text-white">
              {phase === 'sending' ? 'Sending proposal...' : `Awaiting ${promoter.name}'s response...`}
            </p>
          </div>
        )}
        {phase === 'confirmed' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <PartyPopper size={32} style={{ color: PC.emerald }} />
            <p className="text-sm font-bold text-white">Collaboration Confirmed!</p>
            <p className="text-xs text-neutral-500">{promoter.name} accepted your proposal.</p>
          </div>
        )}
      </div>
    </div>
  );
}


const NETWORK_CTA = {
  mutual: { label: 'Propose Collab', doneLabel: 'Collab Requested', Icon: Handshake },
  following: { label: 'Cross-Promote', doneLabel: 'Cross-Promoted', Icon: Repeat2 },
  suggested: { label: 'Follow', doneLabel: 'Following', Icon: UserPlus },
};

function PromoterNetworkCard({ promoter, sent, onAction, onMessage, onProposeCollab }) {
  const cta = NETWORK_CTA[promoter.relationship];
  const buttonStyle = sent
    ? { backgroundColor: 'rgba(34,197,94,0.12)', color: PC.emerald, border: '1px solid rgba(34,197,94,0.35)' }
    : promoter.relationship === 'mutual'
    ? { backgroundColor: PC.emerald, color: '#0A0A0C' }
    : { backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.amethyst}`, color: PC.amethyst };

  return (
    <div className="rounded-2xl p-3.5" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm"
          style={{ backgroundColor: 'rgba(168,85,247,0.12)', color: PC.amethyst }}
        >
          {promoter.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{promoter.name}</p>
            {promoter.trending && (
              <span
                className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: PC.emerald }}
              >
                <TrendingUp size={10} /> Trending
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">{promoter.category} · {promoter.zone}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500">
            <span>{formatNum(promoter.followers)} followers</span>
            {promoter.mutualCollabs > 0 && <span>{promoter.mutualCollabs} past collabs</span>}
          </div>
        </div>
      </div>
      <p className="text-xs text-neutral-400 mt-2.5 leading-relaxed">{promoter.activity}</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onMessage(promoter)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl active:scale-95 transition-transform ${FOCUS_RING}`}
          style={{ backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.border}` }}
          aria-label={`Message ${promoter.name}`}
        >
          <MessageCircle size={14} className="text-neutral-300" />
        </button>
        <button
          onClick={() => (promoter.relationship === 'mutual' ? onProposeCollab(promoter) : onAction(promoter.id))}
          disabled={sent}
          className={`flex-1 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-90 ${FOCUS_RING}`}
          style={buttonStyle}
        >
          {sent ? <CheckCircle2 size={13} /> : <cta.Icon size={13} />}
          {sent ? cta.doneLabel : cta.label}
        </button>
      </div>
    </div>
  );
}

function ActiveCollaborationsSection({ collaborations }) {
  if (collaborations.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Handshake size={14} style={{ color: PC.emerald }} />
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Active Collaborations</h2>
      </div>
      <p className="text-xs text-neutral-600 mb-3">Confirmed joint events with revenue split.</p>
      <div className="space-y-2.5">
        {collaborations.map((c) => (
          <div key={c.id} className="rounded-2xl p-3.5" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-white truncate">{c.title}</p>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: PC.emerald }}
              >
                Confirmed
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">with {c.promoterName}</p>
            <p className="flex items-center gap-1 text-xs font-mono mt-1.5" style={{ color: PC.amethyst }}>
              <Percent size={11} />
              {c.splitLabel}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NetworkFeedSection({ promoters, sentActions, onAction, onMessage, onProposeCollab }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Handshake size={14} style={{ color: PC.amethyst }} />
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Promoter Network</h2>
      </div>
      <p className="text-xs text-neutral-600 mb-3">Promoters you follow, collaborate with, or might want to connect with next.</p>
      <div className="space-y-2.5">
        {promoters.map((promoter) => (
          <PromoterNetworkCard
            key={promoter.id}
            promoter={promoter}
            sent={!!sentActions[promoter.id]}
            onAction={onAction}
            onMessage={onMessage}
            onProposeCollab={onProposeCollab}
          />
        ))}
      </div>
    </section>
  );
}

function MilestoneTracker({ followers, flash, milestones }) {
  const nextMilestone = milestones.find((m) => m.threshold > followers);
  const achievedMilestones = milestones.filter((m) => m.threshold <= followers);
  const prevThreshold = achievedMilestones.length > 0 ? achievedMilestones[achievedMilestones.length - 1].threshold : 0;
  const progressPct = nextMilestone
    ? Math.min(((followers - prevThreshold) / (nextMilestone.threshold - prevThreshold)) * 100, 100)
    : 100;

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={14} style={{ color: PC.amethyst }} />
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Follower Milestones</h2>
      </div>
      <p className="text-xs text-neutral-600 mb-3">Aggregate followers across every property you manage.</p>

      <div className="rounded-2xl p-4" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
        <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">Total Followers</p>
        <p
          className="text-3xl font-extrabold tracking-tight mt-1 transition-colors duration-500"
          style={{ color: flash ? '#ffffff' : PC.amethyst }}
        >
          {formatNum(followers)}
        </p>

        {nextMilestone ? (
          <>
            <div className="flex items-center justify-between mt-3 mb-1">
              <span className="text-xs text-neutral-500">Next: {nextMilestone.label}</span>
              <span className="text-xs font-semibold text-neutral-400">{formatNum(nextMilestone.threshold - followers)} to go</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: PC.border }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, backgroundColor: PC.amethyst }}
              />
            </div>
          </>
        ) : (
          <p className="text-xs mt-3" style={{ color: PC.emerald }}>Every milestone unlocked. Legendary status.</p>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {milestones.map((m) => {
          const achieved = followers >= m.threshold;
          return (
            <div
              key={m.id}
              className="rounded-2xl p-3 flex items-start gap-3"
              style={{
                backgroundColor: achieved ? 'rgba(34,197,94,0.06)' : PC.surface,
                border: `1px solid ${achieved ? 'rgba(34,197,94,0.3)' : PC.border}`,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: achieved ? 'rgba(34,197,94,0.15)' : PC.surfaceAlt }}
              >
                {achieved ? <CheckCircle2 size={15} style={{ color: PC.emerald }} /> : <Lock size={13} className="text-neutral-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-bold ${achieved ? 'text-white' : 'text-neutral-400'}`}>{m.label}</p>
                  <span className="text-xs font-mono text-neutral-500 shrink-0">{formatNum(m.threshold)}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{m.reward}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopSupporterCard({ supporter, rank, granting, onGrant }) {
  const isVip = supporter.vipStatus === 'fast-track';
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{ backgroundColor: PC.surface, border: `1px solid ${isVip ? 'rgba(168,85,247,0.4)' : PC.border}` }}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <AvatarImage
            src={supporter.photo}
            alt={supporter.name}
            name={supporter.name}
            className="w-12 h-12 rounded-full object-cover"
            style={{ border: `2px solid ${PC.border}` }}
          />
          <span
            className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold"
            style={{
              backgroundColor: rank <= 3 ? PC.amethyst : PC.surfaceAlt,
              color: rank <= 3 ? '#0A0A0C' : '#a3a3a3',
              border: `2px solid ${PC.bg}`,
            }}
          >
            {rank}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{supporter.name}</p>
            {isVip && (
              <span
                className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: 'rgba(168,85,247,0.15)', color: PC.amethyst }}
              >
                <Crown size={10} /> VIP
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">{supporter.earlyBirdTier} RSVP · AED {formatNum(supporter.spendAED)} spent</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t text-xs" style={{ borderColor: PC.border }}>
        <div>
          <span className="text-neutral-500 block uppercase text-xs">Tickets Bought</span>
          <span className="text-neutral-200 font-semibold mt-0.5 block">{supporter.ticketsPurchased}</span>
        </div>
        <div>
          <span className="text-neutral-500 block uppercase text-xs">Shares</span>
          <span className="text-neutral-200 font-semibold mt-0.5 block">{supporter.sharesCount}</span>
        </div>
      </div>

      <button
        onClick={() => onGrant(supporter.id)}
        disabled={isVip || granting}
        className={`w-full mt-3 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-90 ${FOCUS_RING}`}
        style={
          isVip
            ? { backgroundColor: 'rgba(168,85,247,0.12)', color: PC.amethyst, border: '1px solid rgba(168,85,247,0.35)' }
            : { backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.amethyst}`, color: PC.amethyst }
        }
      >
        {granting ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Granting Access…
          </>
        ) : isVip ? (
          <>
            <BadgeCheck size={13} /> VIP Fast-Track Active
          </>
        ) : (
          <>
            <Crown size={13} /> Grant VIP Fast-Track
          </>
        )}
      </button>
    </div>
  );
}

function TopSupportersSection({ supporters, grantingId, onGrant }) {
  const ranked = [...supporters].sort((a, b) => b.ticketsPurchased - a.ticketsPurchased);
  return (
    <section>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Crown size={14} style={{ color: PC.amethyst }} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Top Supporters</h2>
        </div>
        <span className="text-xs text-neutral-600">{supporters.length} tracked</span>
      </div>
      <p className="text-xs text-neutral-600 mb-3">Ranked by tickets bought, shares, and how early they RSVP.</p>
      <div className="space-y-2.5">
        {ranked.map((supporter, index) => (
          <TopSupporterCard
            key={supporter.id}
            supporter={supporter}
            rank={index + 1}
            granting={grantingId === supporter.id}
            onGrant={onGrant}
          />
        ))}
      </div>
    </section>
  );
}

function BroadcastComposer({
  title, message, audience, preSale, sending, followerReach,
  onTitleChange, onMessageChange, onAudienceChange, onPreSaleChange, onSend,
}) {
  const reachCount = audience === 'followers' ? followerReach : Math.round(followerReach * 2.4);
  const canSend = title.trim().length > 0 && message.trim().length > 0 && !sending;

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
      <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Headline</label>
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="New lineup announced!"
        maxLength={60}
        className="w-full mt-1.5 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none"
        style={{ backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.border}` }}
      />

      <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mt-3 block">Message</label>
      <textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder="Tell your followers what's new…"
        rows={3}
        maxLength={280}
        className="w-full mt-1.5 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 resize-none focus:outline-none"
        style={{ backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.border}` }}
      />

      <div className="flex gap-2 mt-3">
        {[
          { id: 'followers', label: 'Followers Only' },
          { id: 'public', label: 'Public' },
        ].map((opt) => {
          const active = audience === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onAudienceChange(opt.id)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all active:scale-95 ${FOCUS_RING}`}
              style={
                active
                  ? { backgroundColor: 'rgba(168,85,247,0.14)', color: PC.amethyst, border: `1px solid ${PC.amethyst}` }
                  : { backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.border}`, color: '#737373' }
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPreSaleChange(!preSale)}
        className={`w-full mt-2.5 rounded-xl py-2.5 px-3 flex items-center gap-2.5 text-left transition-all active:scale-95 ${FOCUS_RING}`}
        style={{ backgroundColor: PC.surfaceAlt, border: `1px solid ${preSale ? PC.emerald : PC.border}` }}
      >
        <div
          className="w-4 h-4 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: preSale ? PC.emerald : 'transparent', border: `1.5px solid ${preSale ? PC.emerald : '#525252'}` }}
        >
          {preSale && <Check size={11} color="#0A0A0C" strokeWidth={3} />}
        </div>
        <span className="text-xs font-semibold text-neutral-300">Attach a pre-sale link</span>
      </button>

      <p className="text-xs text-neutral-500 mt-3.5">
        Reaches ~{formatNum(reachCount)} {audience === 'followers' ? 'followers' : 'people'}
      </p>

      <button
        onClick={onSend}
        disabled={!canSend}
        className={`w-full mt-2.5 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 ${FOCUS_RING}`}
        style={{ backgroundColor: PC.amethyst, color: '#0A0A0C' }}
      >
        {sending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Megaphone size={16} /> {audience === 'followers' ? 'Send to Followers' : 'Send Publicly'}
          </>
        )}
      </button>
    </div>
  );
}

function AnnouncementCard({ announcement }) {
  return (
    <div className="rounded-2xl p-3.5" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-white">{announcement.title}</p>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
          style={
            announcement.audience === 'followers'
              ? { backgroundColor: 'rgba(168,85,247,0.15)', color: PC.amethyst }
              : { backgroundColor: 'rgba(115,115,115,0.2)', color: '#a3a3a3' }
          }
        >
          {announcement.audience === 'followers' ? 'Followers Only' : 'Public'}
        </span>
      </div>
      <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{announcement.message}</p>
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t" style={{ borderColor: PC.border }}>
        <span className="text-xs text-neutral-600">{announcement.sentAt}</span>
        {announcement.preSaleAttached && (
          <span className="flex items-center gap-1 text-xs font-mono font-semibold" style={{ color: PC.emerald }}>
            <Ticket size={11} /> {announcement.preSaleCode}
          </span>
        )}
      </div>
    </div>
  );
}

function BroadcastSection({
  title, message, audience, preSale, sending, followerReach, announcements,
  onTitleChange, onMessageChange, onAudienceChange, onPreSaleChange, onSend,
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Megaphone size={14} style={{ color: PC.amethyst }} />
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Follower Broadcast</h2>
      </div>
      <p className="text-xs text-neutral-600 mb-3">Send updates and pre-sale links straight to your followers, before they go public.</p>

      <BroadcastComposer
        title={title}
        message={message}
        audience={audience}
        preSale={preSale}
        sending={sending}
        followerReach={followerReach}
        onTitleChange={onTitleChange}
        onMessageChange={onMessageChange}
        onAudienceChange={onAudienceChange}
        onPreSaleChange={onPreSaleChange}
        onSend={onSend}
      />

      {announcements.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Recent Broadcasts</h3>
          <div className="space-y-2.5">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* Matches the existing applicant-review sheet's own pattern exactly
   (backdrop + translate-y bottom sheet, drag handle, PC.surfaceAlt
   background) rather than importing the landing page's modal style -
   staying consistent with the surface it actually lives in. Every
   field favors a native picker or dropdown over free text, per the
   under-60-second posting requirement. */
function PostEventSheet({
  open, onClose,
  title, date, time, venue, category, ticketPrice, coverImage,
  hasOpenSlot, openSlots,
  onTitleChange, onDateChange, onTimeChange, onVenueChange, onCategoryChange,
  onTicketPriceChange, onCoverImageChange, onHasOpenSlotChange,
  onOpenSlotChange, onAddOpenSlot, onRemoveOpenSlot,
  onSubmit, canSubmit,
}) {
  const fileInputRef = useRef(null);
  const inputStyle = { backgroundColor: PC.surface, border: `1px solid ${PC.border}` };
  const labelClass = 'text-xs font-semibold text-neutral-400 uppercase tracking-wide';
  const fieldClass = 'w-full mt-1.5 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none';

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 rounded-t-3xl transition-transform duration-300 ease-out overflow-y-auto ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ backgroundColor: PC.surfaceAlt, borderTop: `1px solid ${PC.border}`, maxHeight: '90vh' }}
      >
        <div className="max-w-md mx-auto p-5 pb-8">
          <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto mb-3" />
          <div className="flex items-center justify-between -mt-1 mb-3">
            <h2 className="text-base font-extrabold text-white">Post Event</h2>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full active:scale-90 transition-transform ${FOCUS_RING}`}
              style={{ backgroundColor: PC.surface }}
            >
              <X size={16} className="text-neutral-400" />
            </button>
          </div>

          <label className={labelClass}>Event title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Event title"
            className={fieldClass}
            style={inputStyle}
          />

          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className={fieldClass}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className={labelClass}>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className={fieldClass}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
          </div>

          <label className={`${labelClass} mt-3 block`}>Venue</label>
          <input
            type="text"
            value={venue}
            onChange={(e) => onVenueChange(e.target.value)}
            placeholder="Venue name, area"
            className={fieldClass}
            style={inputStyle}
          />

          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className={fieldClass}
                style={inputStyle}
              >
                {FILTERS.filter((f) => f.id !== 'all').map((f) => (
                  <option key={f.id} value={f.id}>{CATEGORY_LABELS[f.id] || f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Ticket price (AED)</label>
              <input
                type="number"
                min="0"
                value={ticketPrice}
                onChange={(e) => onTicketPriceChange(e.target.value)}
                className={fieldClass}
                style={inputStyle}
              />
            </div>
          </div>

          <label className={`${labelClass} mt-3 block`}>Cover image</label>
          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className={`w-full mt-1.5 rounded-xl overflow-hidden text-left transition-all active:scale-95 ${FOCUS_RING}`}
            style={inputStyle}
          >
            {coverImage ? (
              <img src={coverImage} alt="Cover preview" className="h-28 w-full object-cover" />
            ) : (
              <div className="h-16 flex items-center justify-center gap-2 text-neutral-500">
                <Upload size={16} />
                <span className="text-xs font-semibold">Upload cover image</span>
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (file) onCoverImageChange(URL.createObjectURL(file));
            }}
          />

          <button
            type="button"
            onClick={() => onHasOpenSlotChange(!hasOpenSlot)}
            className={`w-full mt-3 rounded-xl p-3.5 flex items-center justify-between gap-3 text-left transition-all active:scale-95 ${FOCUS_RING}`}
            style={{ backgroundColor: PC.surface, border: `1px solid ${hasOpenSlot ? PC.amethyst : PC.border}` }}
          >
            <div>
              <p className="text-sm font-bold text-white">Open Talent Slot</p>
              <p className="text-xs text-neutral-500 mt-0.5">Post a paid staffing opportunity alongside this event</p>
            </div>
            <div
              className="relative w-10 h-6 rounded-full shrink-0 transition-colors"
              style={{ backgroundColor: hasOpenSlot ? PC.amethyst : '#3F3F46' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: hasOpenSlot ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </div>
          </button>

          {hasOpenSlot && (
            <div className="mt-2.5 flex flex-col gap-3">
              {openSlots.map((slot) => (
                <div key={slot.id}>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelClass}>Role needed</label>
                      <input
                        type="text"
                        value={slot.role}
                        onChange={(e) => onOpenSlotChange(slot.id, 'role', e.target.value)}
                        placeholder="e.g. Live DJ, Mixologist, Security..."
                        className={fieldClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Hourly rate (AED)</label>
                      <input
                        type="number"
                        min="0"
                        value={slot.hourlyRate}
                        onChange={(e) => onOpenSlotChange(slot.id, 'hourlyRate', e.target.value)}
                        className={fieldClass}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  {openSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveOpenSlot(slot.id)}
                      className={`mt-1.5 text-xs font-semibold text-neutral-500 underline ${FOCUS_RING}`}
                    >
                      Remove this role
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={onAddOpenSlot}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-bold transition-transform active:scale-95 ${FOCUS_RING}`}
                style={{ borderColor: `${PC.amethyst}88`, color: PC.amethyst }}
              >
                <Plus size={14} />
                Add Another Role
              </button>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`w-full mt-4 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 ${FOCUS_RING}`}
            style={{ backgroundColor: PC.emerald, color: '#052E16' }}
          >
            <Megaphone size={16} />
            Post Event
          </button>
        </div>
      </div>
    </>
  );
}

/* Trend sparkline - replaces a small recharts AreaChart with a plain
   SVG path, since this is the only place in the whole app that used
   recharts. Same visual: a gradient-filled area under a line, driven
   by the same {v: number}[] data shape and color prop. Guards against
   an empty trend array (renders nothing rather than crashing on
   Math.min/max of an empty array) and a single-point array (which
   would otherwise divide by zero when spacing points along the
   x-axis). */
function TrendSparkline({ data, color }) {
  const values = (data || []).map((d) => d.v);
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 300;
  const h = 56;
  const points = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * w : w / 2;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="fillTrendSparkline" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#fillTrendSparkline)" stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

function PromoterHub({ postedEvents, onPostEvent, isActiveHub }) {
  const [currentView, setCurrentView] = useState('hub'); // 'hub' | 'console'
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  // Live, per-property state that persists for the life of the session —
  // keyed by property id so switching properties (or bouncing back to the
  // Hub and returning) never discards that property's tickets, GMV,
  // shifts, applicants, or locked escrow.
  const [propertyStates, setPropertyStates] = useState(createInitialPropertyStates);

  const [flashTickets, setFlashTickets] = useState(false);
  const [flashGmv, setFlashGmv] = useState(false);
  const [filterShiftId, setFilterShiftId] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionState, setActionState] = useState('idle'); // idle | loading | success
  const [verifReqSent, setVerifReqSent] = useState({});

  const [hubTab, setHubTab] = useState('properties'); // 'properties' | 'community' | 'talent-search' | 'profile'

  /* Messaging (Nav-9, suggestion 2). Threads keyed by a synthetic id
     ("talent-{id}" / "network-{id}") rather than the raw source id,
     since TALENT_ROSTER and PROMOTER_NETWORK each have their own id
     space and could theoretically collide. Lifted here rather than
     into MessageThreadSheet itself so reopening a conversation
     (closing the sheet, then tapping Message again) preserves what
     was already sent, matching how every other stateful interaction
     in this app behaves. */
  const [messageThreads, setMessageThreads] = useState({});
  const [activeThreadRecipient, setActiveThreadRecipient] = useState(null);

  /* Collaboration (Nav-9, suggestion 1). activeCollabPromoter drives
     which promoter the CollaborationSheet is currently open for (or
     null when closed); collaborations accumulates confirmed joint
     events for the Active Collaborations section. */
  const [collaborations, setCollaborations] = useState([]);
  const [activeCollabPromoter, setActiveCollabPromoter] = useState(null);

  const [orgFollowers, setOrgFollowers] = useState(ORG_FOLLOWERS_SEED);
  const [flashFollowers, setFlashFollowers] = useState(false);
  const [networkActionSent, setNetworkActionSent] = useState({});
  const [grantingId, setGrantingId] = useState(null);

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState('followers'); // 'followers' | 'public'
  const [broadcastPreSale, setBroadcastPreSale] = useState(false);

  /* Post Event sheet - pre-filled with a complete, realistic, fully
     editable example so posting genuinely takes one tap, matching
     every other pre-filled form already established across the app.
     Venue name reuses "Amethyst Sky Lounge, Al Maryah Island" - the
     same venue already seeded in the landing page's preview grid -
     rather than inventing a new one. Date defaults 7 days out so it
     never silently lands in the past as real time passes. */
  const defaultPostDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);
  const [postEventOpen, setPostEventOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('Rooftop Sessions: Vol. 4');
  const [postDate, setPostDate] = useState(defaultPostDate);
  const [postTime, setPostTime] = useState('21:00');
  const [postVenue, setPostVenue] = useState('Amethyst Sky Lounge, Al Maryah Island');
  const [postCategory, setPostCategory] = useState('nightlife');
  const [postTicketPrice, setPostTicketPrice] = useState('150');
  const [postCoverImage, setPostCoverImage] = useState(null);
  const [postHasOpenSlot, setPostHasOpenSlot] = useState(true);
  const [postOpenSlots, setPostOpenSlots] = useState(createDefaultOpenSlots);

  function addOpenSlotRow() {
    setPostOpenSlots((prev) => [...prev, { id: `slot-${Date.now()}-${prev.length}`, role: '', hourlyRate: '220' }]);
  }

  function removeOpenSlotRow(id) {
    setPostOpenSlots((prev) => (prev.length > 1 ? prev.filter((slot) => slot.id !== id) : prev));
  }

  function updateOpenSlotRow(id, field, value) {
    setPostOpenSlots((prev) => prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)));
  }

  function resetPostEventForm() {
    setPostTitle('Rooftop Sessions: Vol. 4');
    setPostDate(defaultPostDate);
    setPostTime('21:00');
    setPostVenue('Amethyst Sky Lounge, Al Maryah Island');
    setPostCategory('nightlife');
    setPostTicketPrice('150');
    setPostCoverImage(null);
    setPostHasOpenSlot(true);
    setPostOpenSlots(createDefaultOpenSlots());
  }

  const canPostEvent = postTitle.trim().length > 0 && postVenue.trim().length > 0;

  function handlePostEvent() {
    if (!canPostEvent || !onPostEvent) return;
    onPostEvent({
      title: postTitle.trim(),
      date: formatPostedDate(postDate),
      time: postTime,
      venue: postVenue.trim(),
      category: postCategory,
      ticketPriceAED: Number(postTicketPrice) || 0,
      coverImage: postCoverImage,
      hasOpenSlot: postHasOpenSlot,
      openSlots: postHasOpenSlot
        ? postOpenSlots.map((slot) => ({ role: slot.role, hourlyRateAED: Number(slot.hourlyRate) || 0 }))
        : [],
    });
    setPostEventOpen(false);
    resetPostEventForm();
  }

  /* Event Templates / Duplicate (Nav-9, suggestion 5) - pre-fills the
     Post Event form from an existing posted event rather than opening
     it blank, saving the re-typing a recurring format (weekly ladies'
     nights, monthly brunches) otherwise needs every time. Date resets
     to the same 7-days-out default a brand new post uses rather than
     carrying over the original's date - duplicating implies a new
     occurrence, not a copy of the same instance. openSlots are
     transformed back into the form's own field shape (hourlyRateAED
     number -> hourlyRate string, plus fresh slot- ids), since a
     posted event's shape and the form's shape differ slightly by
     design (matching what handlePostEvent above sends out and what
     the <select>-turned-<input> role fields actually bind to). Cover
     image only carries over if it was a genuine upload, not the
     fallback placeholder every promoter-posted event falls back to
     when no cover was provided. */
  function duplicatePostedEvent(ev) {
    setPostTitle(ev.title);
    setPostDate(defaultPostDate);
    setPostTime(ev.time || '21:00');
    setPostVenue(ev.venue);
    setPostCategory(ev.category);
    setPostTicketPrice(ev.price != null ? String(ev.price) : '');
    setPostCoverImage(ev.img && ev.img !== POSTED_EVENT_FALLBACK_IMG ? ev.img : null);
    setPostHasOpenSlot(!!ev.hasOpenSlot);
    setPostOpenSlots(
      ev.hasOpenSlot && ev.openSlots && ev.openSlots.length > 0
        ? ev.openSlots.map((slot, i) => ({
            id: `slot-dup-${i}`,
            role: slot.role,
            hourlyRate: slot.hourlyRateAED != null ? String(slot.hourlyRateAED) : '',
          }))
        : createDefaultOpenSlots()
    );
    setPostEventOpen(true);
  }
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const activeProperty = useMemo(
    () => ORGANIZER_PROPERTIES.find((p) => p.id === selectedPropertyId) || null,
    [selectedPropertyId]
  );
  const activePropertyState = selectedPropertyId ? propertyStates[selectedPropertyId] : null;

  function enterConsole(property) {
    setSelectedPropertyId(property.id);
    setFilterShiftId(null);
    setBroadcastTitle('');
    setBroadcastMessage('');
    setBroadcastAudience('followers');
    setBroadcastPreSale(false);
    setCurrentView('console');
  }

  // Whenever the console isn't the active view, force the applicant sheet
  // closed. Without this, tapping the back arrow while a sheet is open
  // leaves the previous property's applicant overlay floating over the
  // Hub view underneath it.
  useEffect(() => {
    if (currentView !== 'console') {
      setSheetOpen(false);
    }
  }, [currentView]);

  // Real-time sales simulation for whichever property is currently open.
  // Writes into that property's own slice of propertyStates so switching
  // away and back preserves progress instead of resetting it.
  useEffect(() => {
    if (currentView !== 'console' || !activeProperty) return;

    let flashTicketsTimeoutId;
    let flashGmvTimeoutId;
    const propertyId = activeProperty.id;
    const price = activeProperty.ticketPrice;
    const capacity = activeProperty.capacity;

    const intervalId = setInterval(() => {
      const inc = Math.floor(Math.random() * 3) + 1;

      setPropertyStates((prev) => {
        const current = prev[propertyId];
        if (!current) return prev;
        return {
          ...prev,
          [propertyId]: {
            ...current,
            ticketsSold: Math.min(current.ticketsSold + inc, capacity),
            gmv: current.gmv + inc * price,
            trend: [
              ...current.trend.slice(1),
              { i: current.trend[current.trend.length - 1].i + 1, v: 15 + Math.random() * 50 },
            ],
          },
        };
      });

      setFlashTickets(true);
      setFlashGmv(true);
      flashTicketsTimeoutId = setTimeout(() => setFlashTickets(false), 600);
      flashGmvTimeoutId = setTimeout(() => setFlashGmv(false), 600);
    }, 3800);

    return () => {
      clearInterval(intervalId);
      clearTimeout(flashTicketsTimeoutId);
      clearTimeout(flashGmvTimeoutId);
    };
  }, [currentView, activeProperty]);

  // Gentle live-tick for the aggregate follower count while the Community
  // tab is open, mirroring the ticket/GMV simulation above.
  useEffect(() => {
    if (currentView !== 'hub' || hubTab !== 'community') return;

    let flashFollowersTimeoutId;
    const intervalId = setInterval(() => {
      const inc = Math.floor(Math.random() * 3) + 1;
      setOrgFollowers((prev) => prev + inc);
      setFlashFollowers(true);
      flashFollowersTimeoutId = setTimeout(() => setFlashFollowers(false), 600);
    }, 4200);

    return () => {
      clearInterval(intervalId);
      clearTimeout(flashFollowersTimeoutId);
    };
  }, [currentView, hubTab]);

  // O(1) shift lookups by id for the active property, rebuilt only when
  // that property's live shift data changes.
  const shiftMap = useMemo(() => {
    if (!activePropertyState) return {};
    return activePropertyState.shifts.reduce((acc, shift) => {
      acc[shift.id] = shift;
      return acc;
    }, {});
  }, [activePropertyState]);

  const selectedApplicant = useMemo(() => {
    if (!activePropertyState) return null;
    return activePropertyState.applicants.find((a) => a.id === selectedId) || null;
  }, [activePropertyState, selectedId]);

  const visibleApplicants = useMemo(() => {
    if (!activePropertyState) return [];
    if (!filterShiftId) return activePropertyState.applicants;
    return activePropertyState.applicants.filter((a) => a.shiftId === filterShiftId);
  }, [activePropertyState, filterShiftId]);

  const selectedShift = selectedApplicant ? shiftMap[selectedApplicant.shiftId] : null;
  const activeFilterShift = filterShiftId ? shiftMap[filterShiftId] : null;

  function openApplicant(id) {
    setSelectedId(id);
    setSheetOpen(true);
    setActionState('idle');
  }

  function closeSheet() {
    if (actionState === 'loading') return;
    setSheetOpen(false);
  }

  function handleApprove() {
    if (!selectedApplicant || !activeProperty || actionState === 'loading' || selectedApplicant.status === 'approved') {
      return;
    }
    setActionState('loading');
    const propertyId = activeProperty.id;
    const applicantId = selectedApplicant.id;
    const shiftId = selectedApplicant.shiftId;
    const escrowAmount = selectedApplicant.rateAED * selectedApplicant.estHours;

    setTimeout(() => {
      setActionState('success');
      setPropertyStates((prev) => {
        const current = prev[propertyId];
        if (!current) return prev;
        return {
          ...prev,
          [propertyId]: {
            ...current,
            applicants: current.applicants.map((a) =>
              a.id === applicantId ? { ...a, status: 'approved' } : a
            ),
            shifts: current.shifts.map((s) =>
              s.id === shiftId ? { ...s, filled: Math.min(s.filled + 1, s.needed) } : s
            ),
            escrowLocked: current.escrowLocked + escrowAmount,
          },
        };
      });
    }, 1800);
  }

  function requestVerification(id) {
    setVerifReqSent((prev) => ({ ...prev, [id]: true }));
  }

  function sendNetworkAction(id) {
    setNetworkActionSent((prev) => ({ ...prev, [id]: true }));
  }

  function grantVipFastTrack(supporterId) {
    if (!activeProperty || grantingId) return;
    setGrantingId(supporterId);
    const propertyId = activeProperty.id;

    setTimeout(() => {
      setPropertyStates((prev) => {
        const current = prev[propertyId];
        if (!current) return prev;
        return {
          ...prev,
          [propertyId]: {
            ...current,
            topSupporters: current.topSupporters.map((s) =>
              s.id === supporterId ? { ...s, vipStatus: 'fast-track' } : s
            ),
          },
        };
      });
      setGrantingId(null);
    }, 1400);
  }

  function sendBroadcast() {
    if (!activeProperty || sendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setSendingBroadcast(true);
    const propertyId = activeProperty.id;
    const newAnnouncement = {
      id: `ann-${Date.now()}`,
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
      audience: broadcastAudience,
      preSaleAttached: broadcastPreSale,
      preSaleCode: broadcastPreSale ? `PRESALE-${Math.random().toString(36).slice(2, 7).toUpperCase()}` : null,
      sentAt: 'Just now',
    };

    setTimeout(() => {
      setPropertyStates((prev) => {
        const current = prev[propertyId];
        if (!current) return prev;
        return {
          ...prev,
          [propertyId]: {
            ...current,
            announcements: [newAnnouncement, ...current.announcements],
          },
        };
      });
      setSendingBroadcast(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastPreSale(false);
    }, 1400);
  }

  const openThread = useCallback((recipient) => {
    setActiveThreadRecipient(recipient);
    setMessageThreads((prev) =>
      prev[recipient.id]
        ? prev
        : {
            ...prev,
            [recipient.id]: [{ id: `${recipient.id}-seed`, sender: 'them', text: recipient.seedMessage, time: 'Just now' }],
          }
    );
  }, []);

  const handleMessageTalent = useCallback(
    (talent) => {
      openThread({
        id: `talent-${talent.id}`,
        name: talent.name,
        initial: talent.avatarInitial,
        subtitle: talent.specialty,
        seedMessage: `Hi! Thanks for reaching out via VibePass. Happy to talk about ${talent.specialty.toLowerCase()} for your event \u2014 what did you have in mind?`,
      });
    },
    [openThread]
  );

  const handleMessageNetworkPromoter = useCallback(
    (promoter) => {
      openThread({
        id: `network-${promoter.id}`,
        name: promoter.name,
        initial: promoter.name.charAt(0),
        subtitle: promoter.category,
        seedMessage: `Hey! Great to connect on VibePass. Always open to the right collaboration \u2014 what are you thinking?`,
      });
    },
    [openThread]
  );

  const handleSendMessage = useCallback(
    (text) => {
      if (!activeThreadRecipient) return;
      const id = activeThreadRecipient.id;
      setMessageThreads((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), { id: `${id}-${Date.now()}`, sender: 'me', text, time: 'Just now' }],
      }));
    },
    [activeThreadRecipient]
  );

  const handleProposeCollab = useCallback((promoter) => {
    setActiveCollabPromoter(promoter);
  }, []);

  const handleConfirmCollaboration = useCallback((promoter, { title, split, note }) => {
    setCollaborations((prev) => [
      {
        id: `collab-${promoter.id}-${Date.now()}`,
        promoterId: promoter.id,
        promoterName: promoter.name,
        title,
        splitLabel: `You ${split.you} / ${promoter.name.split(' ')[0]} ${split.them}`,
      },
      ...prev,
    ]);
    setNetworkActionSent((prev) => ({ ...prev, [promoter.id]: true }));

    const threadId = `network-${promoter.id}`;
    setMessageThreads((prev) => {
      const existing =
        prev[threadId] ||
        [
          {
            id: `${threadId}-seed`,
            sender: 'them',
            text: 'Hey! Great to connect on VibePass. Always open to the right collaboration \u2014 what are you thinking?',
            time: 'Just now',
          },
        ];
      return {
        ...prev,
        [threadId]: [
          ...existing,
          { id: `${threadId}-collab-note-${Date.now()}`, sender: 'me', text: note, time: 'Just now' },
          {
            id: `${threadId}-collab-accept-${Date.now()}`,
            sender: 'them',
            text: `Love it \u2014 let's do it! "${title}" it is, ${split.you}/${split.them} split works for me.`,
            time: 'Just now',
          },
        ],
      };
    });
  }, []);

  /* Swipe left/right cycles through the hub's own 4 tabs (Properties,
     Community, Talent Search, Profile) - same mechanics as
     ConsumerHub/TalentHub: 60px threshold, a mostly-vertical gesture
     is ignored so normal scrolling isn't mistaken for a tab swipe,
     bounded at each end. Attached only to the "hub" view's own
     scrollable wrapper below, not the separate "console" view (a
     property's own deep-dive screen, reached by tapping into it) -
     swiping while deep in a property's console won't hijack that
     navigation, since this handler simply isn't present there. */
  const hubTabTouchStartRef = useRef(null);
  const handleHubTabTouchStart = useCallback((e) => {
    const t = e.touches[0];
    hubTabTouchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const handleHubTabTouchEnd = useCallback(
    (e) => {
      const start = hubTabTouchStartRef.current;
      hubTabTouchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const SWIPE_THRESHOLD = 60;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const order = PROMOTER_HUB_TABS.map((t) => t.id);
      const currentIndex = order.indexOf(hubTab);
      const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= 0 && nextIndex < order.length) setHubTab(order[nextIndex]);
    },
    [hubTab]
  );

  /* Swipe tutorial - same pattern as ConsumerHub/TalentHub, scoped to
     currentView === 'hub' since the swipe-to-cycle-tabs behavior only
     exists there; the separate 'console' view (a property's own
     deep-dive screen) has no swipeable tabs to teach. currentView is
     in the dependency array so this correctly re-evaluates if the
     promoter is deep in a console before ever having seen the hub
     view active (edge case, but cheap to handle correctly). */
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const swipeTutorialTriggeredRef = useRef(false);
  useEffect(() => {
    if (isActiveHub && currentView === 'hub' && !swipeTutorialTriggeredRef.current) {
      swipeTutorialTriggeredRef.current = true;
      const t = setTimeout(() => setShowSwipeTutorial(true), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isActiveHub, currentView]);

  return (
    <>
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        ::selection { background-color: rgba(168, 85, 247, 0.3); }
        @media (prefers-reduced-motion: reduce) {
          .animate-pop-in { animation: none; }
          .motion-safe-ping { animation: none !important; }
        }
      `}</style>

      {/* =========================================================
          VIEW 1: THE HUB SELECTOR SCREEN (HOME VIEW)
          ========================================================= */}
      {currentView === 'hub' && (
        <div
          /* w-full is load-bearing: without an explicit width this flex column
             sizes to its content, so a tab whose content is narrower than the
             others — Profile, which is a centred avatar and a detail list —
             shrank the whole shell and shifted every box on the screen. With
             w-full the shell is always max-w-md wide and only the content
             inside a tab changes. */
          className="flex w-full flex-1 max-w-md mx-auto flex-col justify-between overflow-y-auto vp-noscroll"
          onTouchStart={handleHubTabTouchStart}
          onTouchEnd={handleHubTabTouchEnd}
        >
          <div>
            <header className="px-4 pt-6 pb-4 border-b" style={{ borderColor: PC.border }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${PC.amethyst}, ${PC.emerald})` }}
                  >
                    <Sparkles size={18} className="text-black" />
                  </div>
                  <div>
                    <h1 className="text-sm font-black tracking-tight uppercase">Vibe<span style={{ color: PC.amethyst }}>Pass</span></h1>
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Enterprise Controller</p>
                  </div>
                </div>
                <button
                  onClick={() => setPostEventOpen(true)}
                  className="w-8 h-8 rounded-full border flex items-center justify-center active:scale-95 transition-transform"
                  style={{ backgroundColor: PC.surface, borderColor: PC.border }}
                  aria-label="Post a new event"
                >
                  <Plus size={16} className="text-neutral-400" />
                </button>
              </div>
            </header>

            <main className="p-4 space-y-6">
              <div className="rounded-2xl p-4 border relative overflow-hidden" style={{ backgroundColor: PC.surface, borderColor: PC.border }}>
                <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-10" style={{ backgroundColor: PC.amethyst }} />
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-900 border flex items-center justify-center" style={{ borderColor: PC.border }}>
                    <Building2 size={20} style={{ color: PC.amethyst }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Falcon Hospitality Group</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">3 active locations under management</p>
                  </div>
                </div>
              </div>

              <HubTabs value={hubTab} onChange={setHubTab} />

              {hubTab === 'properties' && (
              <div>
                <PortfolioRollupSection properties={ORGANIZER_PROPERTIES} propertyStates={propertyStates} />
                {postedEvents && postedEvents.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">My Posted Events</h3>
                    <div className="space-y-2.5">
                      {postedEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="rounded-2xl p-3.5 border flex items-center justify-between gap-3"
                          style={{ backgroundColor: PC.surface, borderColor: PC.border }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">{ev.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                              <span className="flex items-center gap-1">
                                <MapPin size={11} className="shrink-0" />
                                {ev.date}
                              </span>
                              {ev.hasOpenSlot && (
                                <span className="flex items-center gap-1" style={{ color: PC.amethyst }}>
                                  <Users size={11} className="shrink-0" />
                                  {ev.openSlots.length === 1
                                    ? `${ev.openSlots[0].role} slot open`
                                    : `${ev.openSlots.length} roles open`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <span
                              className="text-xs font-bold uppercase px-2.5 py-1 rounded-full border"
                              style={{ backgroundColor: 'rgba(34,197,94,0.1)', borderColor: PC.emerald, color: PC.emerald }}
                            >
                              {ev.status}
                            </span>
                            <button
                              onClick={() => duplicatePostedEvent(ev)}
                              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold active:scale-95 transition-transform ${FOCUS_RING}`}
                              style={{ backgroundColor: PC.surfaceAlt, border: `1px solid ${PC.border}`, color: '#9CA3AF' }}
                              aria-label={`Duplicate ${ev.title}`}
                            >
                              <Copy size={10} />
                              Duplicate
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Live Venues & Events</h3>
                <div className="space-y-3">
                  {ORGANIZER_PROPERTIES.map((property) => {
                    const isConcert = property.type === 'Event';

                    return (
                      <button
                        key={property.id}
                        onClick={() => enterConsole(property)}
                        className={`w-full text-left rounded-2xl p-4 border transition-all active:scale-95 ${FOCUS_RING}`}
                        style={{ backgroundColor: PC.surface, borderColor: PC.border }}
                      >
                        <div className="flex justify-between items-start">
                          <span
                            className="text-xs font-bold uppercase px-2 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: isConcert ? 'rgba(168,85,247,0.1)' : 'rgba(34,197,94,0.1)',
                              borderColor: isConcert ? PC.amethyst : PC.emerald,
                              color: isConcert ? PC.amethyst : PC.emerald,
                            }}
                          >
                            {property.type}
                          </span>
                          <span className="text-xs font-mono text-neutral-500">{property.dctPermit}</span>
                        </div>

                        <h4 className="text-base font-extrabold text-white mt-2.5">{property.name}</h4>

                        <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-400">
                          <MapPin size={12} className="shrink-0 text-neutral-600" />
                          <span className="truncate">{property.venue}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t text-xs font-mono" style={{ borderColor: PC.border }}>
                          <div>
                            <span className="text-neutral-500 block uppercase text-xs">Staff Positions</span>
                            <span className="text-neutral-200 font-semibold mt-0.5 block">{property.shifts.length} active vacancies</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block uppercase text-xs">Sales Capacity</span>
                            <span className="text-neutral-200 font-semibold mt-0.5 block">Max {formatNum(property.capacity)} guest limit</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              {hubTab === 'community' && (
                <div className="space-y-6">
                  <ActiveCollaborationsSection collaborations={collaborations} />
                  <NetworkFeedSection
                    promoters={PROMOTER_NETWORK}
                    sentActions={networkActionSent}
                    onAction={sendNetworkAction}
                    onMessage={handleMessageNetworkPromoter}
                    onProposeCollab={handleProposeCollab}
                  />
                  <MilestoneTracker
                    followers={orgFollowers}
                    flash={flashFollowers}
                    milestones={FOLLOWER_MILESTONES}
                  />
                </div>
              )}

              {hubTab === 'talent-search' && <PromoterTalentSearchView onMessage={handleMessageTalent} />}

              {hubTab === 'profile' && <PromoterProfileView />}
            </main>
          </div>

          <footer className="p-4 text-center">
            <p className="text-xs text-neutral-600 uppercase tracking-widest font-mono">Vibe Pass Node v2.4 · ADGM Vault Secure</p>
          </footer>
        </div>
      )}

      {/* =========================================================
          VIEW 2: DYNAMIC ORGANIZER CONSOLE VIEW
          ========================================================= */}
      {currentView === 'console' && activeProperty && activePropertyState && (
        <div className="flex flex-1 max-w-md mx-auto flex-col overflow-y-auto vp-noscroll">
          <header
            className="sticky top-0 z-20 px-4 pt-4 pb-3 backdrop-blur-md flex items-center justify-between"
            style={{ backgroundColor: 'rgba(10,10,12,0.85)', borderBottom: `1px solid ${PC.border}` }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('hub')}
                className="w-8 h-8 rounded-full border flex items-center justify-center active:scale-90 transition-all"
                style={{ backgroundColor: PC.surface, borderColor: PC.border }}
              >
                <ArrowLeft size={16} className="text-neutral-400" />
              </button>
              <div>
                <p className="text-sm font-bold leading-none tracking-tight">Vibe Pass</p>
                <p className="text-xs text-neutral-500 leading-none mt-1">Live Console</p>
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="motion-safe-ping animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: PC.emerald }}
                />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: PC.emerald }} />
              </span>
              <span className="text-xs font-semibold tracking-wide text-neutral-300">LIVE</span>
            </div>
          </header>

          <main className="px-4 pt-4 pb-24 space-y-6">
            <div className="rounded-2xl p-3.5 animate-pop-in" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">{activeProperty.type} Active Profile</p>
                  <p className="text-base font-bold text-white mt-1 truncate">{activeProperty.name}</p>
                  <p className="text-xs text-neutral-400 flex items-center gap-1 mt-1">
                    <MapPin size={11} /> {activeProperty.venue} · {activeProperty.date}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: PC.emerald, border: '1px solid rgba(34,197,94,0.35)' }}
                  >
                    <BadgeCheck size={12} /> DCT Permit Verified
                  </span>
                  <span className="text-xs text-neutral-600 font-mono">#{activeProperty.dctPermit}</span>
                </div>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Live Analytics</h2>
                <span className="text-xs text-neutral-600">Auto-refreshing</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3.5" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
                  <div className="flex items-center gap-1.5 text-neutral-500 mb-2">
                    <Ticket size={13} />
                    <span className="text-xs font-semibold uppercase tracking-wide">Tickets Sold</span>
                  </div>
                  <p
                    className="text-2xl font-extrabold tracking-tight transition-colors duration-500"
                    style={{ color: flashTickets ? '#ffffff' : PC.emerald }}
                  >
                    {formatNum(activePropertyState.ticketsSold)}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">of {formatNum(activeProperty.capacity)} capacity</p>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: PC.border }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((activePropertyState.ticketsSold / activeProperty.capacity) * 100, 100)}%`, backgroundColor: PC.emerald }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl p-3.5" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
                  <div className="flex items-center gap-1.5 text-neutral-500 mb-2">
                    <Wallet size={13} />
                    <span className="text-xs font-semibold uppercase tracking-wide">GMV</span>
                  </div>
                  <p
                    className="text-xl font-extrabold tracking-tight transition-colors duration-500"
                    style={{ color: flashGmv ? '#ffffff' : PC.amethyst }}
                  >
                    AED {formatNum(activePropertyState.gmv)}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    ≈ AED {Math.round(activePropertyState.gmv / activePropertyState.ticketsSold || 0)} avg
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: PC.emerald }}>
                    <TrendingUp size={12} /> <span>Positive momentum</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl p-3" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sales Velocity</span>
                  <span className="text-xs font-semibold" style={{ color: PC.emerald }}>
                    +{formatNum(activePropertyState.trend[activePropertyState.trend.length - 1]?.v || 0)}/tick
                  </span>
                </div>
                <div style={{ height: 56 }}>
                  <TrendSparkline data={activePropertyState.trend} color={PC.emerald} />
                </div>
              </div>

              <div
                className="mt-3 flex items-center justify-between rounded-2xl p-3"
                style={{ backgroundColor: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)' }}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} style={{ color: PC.amethyst }} />
                  <div>
                    <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wide">ADGM Regulated Escrow Vault</p>
                    <p className="text-sm font-bold text-white">{formatAED(activePropertyState.escrowLocked)}</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">B2B Staffing Portal</h2>
                  <p className="text-xs text-neutral-600 mt-1">Active shift vacancies</p>
                </div>
                {filterShiftId && (
                  <button
                    onClick={() => setFilterShiftId(null)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full active:scale-95 transition-transform ${FOCUS_RING}`}
                    style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}`, color: PC.amethyst }}
                  >
                    Clear filter ×
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {activePropertyState.shifts.map((shift) => {
                  const Icon = SHIFT_ICONS[shift.role] || Users;
                  const isFull = shift.filled >= shift.needed;
                  const isActive = filterShiftId === shift.id;
                  return (
                    <button
                      key={shift.id}
                      onClick={() => setFilterShiftId(isActive ? null : shift.id)}
                      className={`w-full text-left rounded-2xl p-3.5 active:scale-95 transition-transform ${FOCUS_RING}`}
                      style={{
                        backgroundColor: isActive ? 'rgba(168,85,247,0.1)' : PC.surface,
                        border: `1px solid ${isActive ? PC.amethyst : PC.border}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: 'rgba(168,85,247,0.12)' }}
                        >
                          <Icon size={18} style={{ color: PC.amethyst }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-white">{shift.role}</p>
                            {shift.urgency === 'critical' && !isFull && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                                URGENT
                              </span>
                            )}
                            {shift.urgency === 'high' && !isFull && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-amber-950">
                                HIGH NEED
                              </span>
                            )}
                            {isFull && (
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: PC.emerald }}
                              >
                                FILLED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                            <MapPin size={11} /> {shift.venue} — {shift.zone}
                          </p>
                          <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                            <Clock size={11} /> {shift.date} · {shift.time}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: PC.border }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${(shift.filled / shift.needed) * 100}%`,
                                  backgroundColor: isFull ? PC.emerald : PC.amethyst,
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-neutral-400 shrink-0">
                              {shift.filled}/{shift.needed} filled
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-neutral-600 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Applicants
                  {activeFilterShift && <span style={{ color: PC.amethyst }}> · {activeFilterShift.role}</span>}
                </h2>
                <span className="text-xs text-neutral-600">{visibleApplicants.length} freelancers found</span>
              </div>

              {visibleApplicants.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-2xl flex flex-col items-center justify-center" style={{ borderColor: PC.border }}>
                  <Users size={22} className="text-neutral-600 mb-2" />
                  <p className="text-xs font-semibold text-neutral-400">No active applicants matching filters</p>
                  <p className="text-xs text-neutral-600 mt-1">Check alternate roles or clear filters above</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visibleApplicants.map((a) => {
                    const shiftForA = shiftMap[a.shiftId];
                    return (
                      <button
                        key={a.id}
                        onClick={() => openApplicant(a.id)}
                        disabled={a.status === 'approved'}
                        className={`w-full text-left rounded-2xl p-3 active:scale-95 transition-transform disabled:opacity-80 ${FOCUS_RING}`}
                        style={{
                          backgroundColor: PC.surface,
                          border: `1px solid ${a.status === 'approved' ? 'rgba(34,197,94,0.4)' : PC.border}`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <AvatarImage
                              src={a.photo}
                              alt={a.name}
                              name={a.name}
                              className="w-14 h-14 rounded-full object-cover"
                              style={{ border: `2px solid ${PC.border}` }}
                            />
                            {a.verified ? (
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: PC.emerald, border: `2px solid ${PC.surface}` }}
                              >
                                <BadgeCheck size={11} className="text-black" />
                              </div>
                            ) : (
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-amber-500"
                                style={{ border: `2px solid ${PC.surface}` }}
                              >
                                <AlertTriangle size={10} className="text-amber-950" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-white truncate">{a.name}</p>
                              {a.status === 'approved' && (
                                <span
                                  className="text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5"
                                  style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: PC.emerald }}
                                >
                                  <CheckCircle2 size={10} /> LOCKED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500">
                              {a.role} · {shiftForA ? shiftForA.zone : ''}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <StarRow rating={a.rating} />
                              <span className="text-xs text-neutral-500">
                                {a.rating.toFixed(1)} · {a.completedGigs} gigs
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-extrabold" style={{ color: PC.emerald }}>
                              AED {a.rateAED}
                            </p>
                            <p className="text-xs text-neutral-500">/hour</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <TopSupportersSection
              supporters={activePropertyState.topSupporters}
              grantingId={grantingId}
              onGrant={grantVipFastTrack}
            />

            <BroadcastSection
              title={broadcastTitle}
              message={broadcastMessage}
              audience={broadcastAudience}
              preSale={broadcastPreSale}
              sending={sendingBroadcast}
              followerReach={activeProperty.followerReach}
              announcements={activePropertyState.announcements}
              onTitleChange={setBroadcastTitle}
              onMessageChange={setBroadcastMessage}
              onAudienceChange={setBroadcastAudience}
              onPreSaleChange={setBroadcastPreSale}
              onSend={sendBroadcast}
            />
          </main>
        </div>
      )}

      {/* =========================================================
          MODAL: POST EVENT SHEET
          ========================================================= */}
      <PostEventSheet
        open={postEventOpen}
        onClose={() => setPostEventOpen(false)}
        title={postTitle}
        date={postDate}
        time={postTime}
        venue={postVenue}
        category={postCategory}
        ticketPrice={postTicketPrice}
        coverImage={postCoverImage}
        hasOpenSlot={postHasOpenSlot}
        openSlots={postOpenSlots}
        onTitleChange={setPostTitle}
        onDateChange={setPostDate}
        onTimeChange={setPostTime}
        onVenueChange={setPostVenue}
        onCategoryChange={setPostCategory}
        onTicketPriceChange={setPostTicketPrice}
        onCoverImageChange={setPostCoverImage}
        onHasOpenSlotChange={setPostHasOpenSlot}
        onOpenSlotChange={updateOpenSlotRow}
        onAddOpenSlot={addOpenSlotRow}
        onRemoveOpenSlot={removeOpenSlotRow}
        onSubmit={handlePostEvent}
        canSubmit={canPostEvent}
      />

      {/* =========================================================
          MODAL: MESSAGE THREAD SHEET
          ========================================================= */}
      {activeThreadRecipient && (
        <MessageThreadSheet
          recipient={activeThreadRecipient}
          messages={messageThreads[activeThreadRecipient.id] || []}
          onSend={handleSendMessage}
          onClose={() => setActiveThreadRecipient(null)}
        />
      )}

      {/* =========================================================
          MODAL: COLLABORATION PROPOSAL SHEET
          ========================================================= */}
      {activeCollabPromoter && (
        <CollaborationSheet
          promoter={activeCollabPromoter}
          onClose={() => setActiveCollabPromoter(null)}
          onConfirm={(payload) => handleConfirmCollaboration(activeCollabPromoter, payload)}
        />
      )}

      {/* =========================================================
          MODAL: SWIPE TUTORIAL
          ========================================================= */}
      {showSwipeTutorial && currentView === 'hub' && (
        <SwipeTutorialOverlay
          onDismiss={() => setShowSwipeTutorial(false)}
          tabLabels={PROMOTER_HUB_TABS.map((t) => t.label)}
          tokens={{ surface: PC.surface, line: PC.border, textHi: '#FFFFFF', textMid: '#9CA3AF', accent: PC.amethyst, accentText: '#1A0B2E' }}
        />
      )}

      {/* =========================================================
          MODAL: APPLICANT SHEET DETAILS
          ========================================================= */}
      <div
        onClick={closeSheet}
        className={`fixed inset-0 z-30 transition-opacity duration-300 ${
          sheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-40 rounded-t-3xl transition-transform duration-300 ease-out overflow-y-auto ${
          sheetOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ backgroundColor: PC.surfaceAlt, borderTop: `1px solid ${PC.border}`, maxHeight: '90vh' }}
      >
        <div className="max-w-md mx-auto p-5 pb-8">
          <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto mb-3" />
          <div className="flex justify-end -mt-1 mb-1">
            <button
              onClick={closeSheet}
              disabled={actionState === 'loading'}
              className={`p-1.5 rounded-full active:scale-90 transition-transform disabled:opacity-30 ${FOCUS_RING}`}
              style={{ backgroundColor: PC.surface }}
            >
              <X size={16} className="text-neutral-400" />
            </button>
          </div>

          {selectedApplicant && actionState !== 'success' && (
            <>
              <div className="flex items-center gap-3">
                <AvatarImage
                  src={selectedApplicant.photo}
                  alt={selectedApplicant.name}
                  name={selectedApplicant.name}
                  className="w-16 h-16 rounded-full object-cover"
                  style={{ border: `2px solid ${PC.border}` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-extrabold text-white truncate">{selectedApplicant.name}</p>
                    {selectedApplicant.verified && <BadgeCheck size={16} style={{ color: PC.emerald }} />}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {selectedApplicant.role} — {selectedShift ? `${selectedShift.zone}, ${selectedShift.venue}` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRow rating={selectedApplicant.rating} />
                    <span className="text-xs text-neutral-500">
                      {selectedApplicant.rating.toFixed(1)} ({selectedApplicant.completedGigs} gigs completed)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl p-2.5" style={{ backgroundColor: PC.surface }}>
                  <p className="text-xs text-neutral-500 uppercase font-semibold tracking-wide">Emirates ID System</p>
                  <p
                    className="text-xs font-bold flex items-center gap-1 mt-1"
                    style={{ color: selectedApplicant.emiratesIdVerified ? PC.emerald : '#fbbf24' }}
                  >
                    {selectedApplicant.emiratesIdVerified ? <BadgeCheck size={13} /> : <AlertTriangle size={13} />}
                    {selectedApplicant.emiratesIdVerified ? 'Verified Active' : 'Pending Review'}
                  </p>
                </div>
                <div className="rounded-xl p-2.5" style={{ backgroundColor: PC.surface }}>
                  <p className="text-xs text-neutral-500 uppercase font-semibold tracking-wide">MoHRE Legal Permit</p>
                  <p
                    className="text-xs font-bold flex items-center gap-1 mt-1"
                    style={{ color: selectedApplicant.mohrePermitActive ? PC.emerald : '#fbbf24' }}
                  >
                    {selectedApplicant.mohrePermitActive ? <BadgeCheck size={13} /> : <AlertTriangle size={13} />}
                    {selectedApplicant.mohrePermitActive ? 'Permit Active' : 'Not Uploaded'}
                  </p>
                </div>
              </div>

              {selectedApplicant.verified ? (
                <>
                  <div className="mt-4 rounded-xl p-3.5 space-y-1.5" style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}` }}>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Hourly rate</span>
                      <span className="font-semibold text-neutral-200">AED {selectedApplicant.rateAED}/hr</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Estimated shift length</span>
                      <span className="font-semibold text-neutral-200">{selectedApplicant.estHours} hrs</span>
                    </div>
                    <div className="h-px my-1" style={{ backgroundColor: PC.border }} />
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-white">Total Escrow Commit</span>
                      <span className="font-extrabold" style={{ color: PC.emerald }}>
                        {formatAED(selectedApplicant.rateAED * selectedApplicant.estHours)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed">
                    Funds lock inside Vibe Pass' ADGM-regulated escrow framework and release safely to the partner only upon digital check-out verification.
                  </p>

                  <button
                    onClick={handleApprove}
                    disabled={actionState === 'loading'}
                    className={`w-full mt-4 rounded-2xl py-4 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-80 ${FOCUS_RING}`}
                    style={{ backgroundColor: PC.emerald, color: '#0A0A0C' }}
                  >
                    {actionState === 'loading' ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Locking ADGM Escrow…
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} /> Approve & Lock Escrow Funds
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="mt-4 rounded-xl p-3.5 flex gap-2.5"
                    style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.35)' }}
                  >
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200 leading-relaxed">
                      This freelancer requires updated verification before active allocation can complete.
                    </p>
                  </div>
                  <button
                    onClick={() => requestVerification(selectedApplicant.id)}
                    disabled={!!verifReqSent[selectedApplicant.id]}
                    className={`w-full mt-4 rounded-2xl py-4 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-70 ${FOCUS_RING}`}
                    style={{
                      backgroundColor: verifReqSent[selectedApplicant.id] ? PC.surface : PC.amethyst,
                      color: verifReqSent[selectedApplicant.id] ? PC.amethyst : '#ffffff',
                      border: verifReqSent[selectedApplicant.id] ? `1px solid ${PC.amethyst}` : 'none',
                    }}
                  >
                    {verifReqSent[selectedApplicant.id] ? (
                      <>
                        <CheckCircle2 size={18} /> Request Sent
                      </>
                    ) : (
                      'Request Emirates ID & MoHRE Documents'
                    )}
                  </button>
                </>
              )}
            </>
          )}

          {selectedApplicant && actionState === 'success' && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative flex items-center justify-center w-20 h-20">
                <span
                  className="motion-safe-ping absolute inline-flex h-full w-full rounded-full animate-ping"
                  style={{ backgroundColor: 'rgba(34,197,94,0.4)' }}
                />
                <div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center animate-pop-in"
                  style={{ backgroundColor: PC.emerald }}
                >
                  <CheckCircle2 size={32} className="text-black" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-lg font-extrabold text-white mt-4">Escrow Locked Successfully</p>
              <p className="text-sm text-neutral-400 mt-1 text-center">
                {formatAED(selectedApplicant.rateAED * selectedApplicant.estHours)} secured for {selectedApplicant.name.split(' ')[0]}
              </p>
              <p className="text-xs text-neutral-600 mt-1">Status locked until shift completion sign-off</p>
              <button
                onClick={closeSheet}
                className={`mt-6 px-6 py-2.5 rounded-full text-xs font-bold active:scale-95 transition-transform ${FOCUS_RING}`}
                style={{ backgroundColor: PC.surface, border: `1px solid ${PC.border}`, color: '#ffffff' }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
/* ============================================================
   ROOT APP — unified shell
   Owns: which hub is active, and whether the intro splash is
   still showing. Both ConsumerHub and TalentHub are always
   mounted (visibility toggled via "contents"/"hidden") rather
   than conditionally rendered, so switching hubs never resets a
   ticket mid-purchase or a verification wizard step in progress -
   this is the "data can flow gracefully" state-consolidation the
   merge asked for, without risking a deep rewrite of either hub's
   internal state tree.
   ============================================================ */
/* First-time-only gate shown before a hub switch (by tap or swipe)
   proceeds to the pre-filled sign-up flow for that role. */
function HubSwitchConfirm({ targetLabel, onConfirm, onCancel }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.75)", zIndex: 2600 }}
    >
      <div
        className="w-full max-w-xs rounded-3xl border p-5 text-center"
        style={{ background: C.surface, borderColor: C.line, animation: "vpPop 0.2s ease" }}
      >
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "rgba(168,85,247,0.12)" }}
        >
          <Repeat2 size={22} color={C.amethyst} />
        </div>
        <p className="mt-3 text-base font-bold" style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}>
          Switch to {targetLabel}?
        </p>
        <p className="mt-1.5 text-xs" style={{ color: C.textMid }}>
          You haven&apos;t set up {targetLabel} yet. We&apos;ll take you through a quick registration first.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex h-11 flex-1 items-center justify-center rounded-full text-sm font-semibold transition-transform active:scale-95"
            style={{ background: C.surfaceHi, border: `1px solid ${C.line}`, color: C.textMid }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex h-11 flex-1 items-center justify-center rounded-full text-sm font-bold transition-transform active:scale-95"
            style={{ background: C.emerald, color: "#052E16" }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function VibePassApp({ initialHub = "consumer" }) {
  const [activeHub, setActiveHub] = useState(initialHub);
  const [showSplash, setShowSplash] = useState(true);
  const dismissSplash = useCallback(() => setShowSplash(false), []);

  /* Single source of truth for everything a promoter posts this
     session - lifted here, the common parent of Consumer/Talent/
     Promoter, so one submitted event can be read by all three hubs
     without duplicating it into three separate copies. Wired into
     ConsumerHub/TalentHub/PromoterHub in the next batch. */
  const [postedEvents, setPostedEvents] = useState([]);
  const addPostedEvent = useCallback((eventInput) => {
    setPostedEvents((prev) => [createPostedEvent(eventInput), ...prev]);
  }, []);

  /* First-time-only gate: switching to a hub (tap OR swipe) you
     haven't visited yet asks for confirmation, then re-runs the
     pre-filled sign-up flow for that role before actually landing
     there. The hub you entered through (initialHub) is already
     "visited" - you just signed up for it on the landing page, so
     re-asking immediately would be redundant. Every hub reached this
     way stays visited for the rest of the session; switching back
     later is instant, same as tapping the hub you started on. */
  const [visitedHubs, setVisitedHubs] = useState(() => new Set([initialHub]));
  const [pendingHubSwitch, setPendingHubSwitch] = useState(null);
  const [inAppAuthState, setInAppAuthState] = useState(null);

  const requestHubSwitch = useCallback(
    (target) => {
      if (target === activeHub) return;
      if (visitedHubs.has(target)) {
        setActiveHub(target);
        return;
      }
      setPendingHubSwitch(target);
    },
    [activeHub, visitedHubs]
  );

  const confirmPendingSwitch = useCallback(() => {
    if (!pendingHubSwitch) return;
    const role = pendingHubSwitch === "consumer" ? "fan" : pendingHubSwitch;
    setPendingHubSwitch(null);
    setInAppAuthState({ trigger: "apply", role });
  }, [pendingHubSwitch]);

  const cancelPendingSwitch = useCallback(() => setPendingHubSwitch(null), []);

  const completeInAppSwitch = useCallback((hub) => {
    setInAppAuthState(null);
    setVisitedHubs((prev) => new Set([...prev, hub]));
    setActiveHub(hub);
  }, []);
  const handleInAppConsumerEnter = useCallback(() => completeInAppSwitch("consumer"), [completeInAppSwitch]);
  const handleInAppTalentVerified = useCallback(() => completeInAppSwitch("talent"), [completeInAppSwitch]);
  const handleInAppPromoterVerified = useCallback(() => completeInAppSwitch("promoter"), [completeInAppSwitch]);
  const handleInAppMockLogin = useCallback(
    (role) => completeInAppSwitch(role === "fan" ? "consumer" : role),
    [completeInAppSwitch]
  );

  return (
    <div className="flex min-h-screen w-full justify-center" style={{ background: "#050507" }}>
      <style>{`
        @keyframes vpSlideUp { from { transform: translateY(48px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes vpFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes vpScan { 0% { top: -12%; } 100% { top: 106%; } }
        @keyframes vpPop { 0% { transform: scale(0.94); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes vpSwipeHint { 0%, 100% { transform: translateX(-14px); opacity: 0.4; } 50% { transform: translateX(14px); opacity: 1; } }
        @keyframes vpToast { 0% { transform: translateY(-14px); opacity: 0; } 12% { transform: translateY(0); opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes vpDropIn { from { transform: translate(-50%, -14px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes vpRingPulse { 0% { transform: scale(0.8); opacity: 0.9; } 50% { transform: scale(1.2); opacity: 0.4; } 100% { transform: scale(0.8); opacity: 0.9; } }
        @keyframes vpPinIn { 0% { transform: scale(0.4); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes vpPinActive { 0% { transform: scale(1); } 100% { transform: scale(1.18); } }
        @keyframes vpNfcPulse { 0% { transform: scale(0.7); opacity: 0.75; } 70% { transform: scale(1.55); opacity: 0; } 100% { transform: scale(1.55); opacity: 0; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.45; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.18); } }
        @keyframes vpSplashIconIn { 0% { transform: scale(0.3); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes vpSplashAmbient { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
        * { -webkit-tap-highlight-color: transparent; }
        .vp-noscroll::-webkit-scrollbar { display: none; }
        .vp-noscroll { scrollbar-width: none; }
        .vp-price-pin {
          position: absolute;
          transform: translate(-50%, -50%);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          padding: 5px 11px;
          border-radius: 9999px;
          background: #0A0A0C;
          color: #FFFFFF;
          font-size: 11.5px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0.01em;
          border: 1.5px solid #22C55E;
          cursor: pointer;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          animation: vpPinIn 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.35) both;
        }
        .vp-price-pin:active { transform: translate(-50%, -50%) scale(0.92); }
        .vp-pin-dot { width: 6px; height: 6px; border-radius: 9999px; display: inline-block; }
        .vp-price-pin-active { animation: vpPinActive 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.4) both; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
      <div
        className="relative flex h-screen w-full max-w-md flex-col overflow-hidden font-sans"
        style={{ background: C.bg }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(340px 200px at 85% -5%, rgba(168,85,247,0.13), transparent), radial-gradient(340px 220px at 0% 30%, rgba(34,197,94,0.09), transparent)",
            zIndex: 1,
          }}
        />
        <StatusBar variant={activeHub} />
        <HubSwitcher activeHub={activeHub} onSwitch={requestHubSwitch} />

        <div className={activeHub === "consumer" ? "contents" : "hidden"}>
          <AppErrorBoundary label="Fan Pass">
            <ConsumerHub postedEvents={postedEvents} isActiveHub={activeHub === "consumer"} />
          </AppErrorBoundary>
        </div>
        <div className={activeHub === "talent" ? "contents" : "hidden"}>
          <AppErrorBoundary label="Talent Pass">
            <TalentHub postedEvents={postedEvents} isActiveHub={activeHub === "talent"} />
          </AppErrorBoundary>
        </div>
        <div className={activeHub === "promoter" ? "contents" : "hidden"}>
          <AppErrorBoundary label="Promoter">
            <PromoterHub postedEvents={postedEvents} onPostEvent={addPostedEvent} isActiveHub={activeHub === "promoter"} />
          </AppErrorBoundary>
        </div>

        {showSplash && <SplashScreen onFinish={dismissSplash} />}
        {pendingHubSwitch && (
          <HubSwitchConfirm
            targetLabel={(HUB_SWITCHER_ITEMS.find((h) => h.id === pendingHubSwitch) || {}).label || pendingHubSwitch}
            onConfirm={confirmPendingSwitch}
            onCancel={cancelPendingSwitch}
          />
        )}
        {inAppAuthState && (
          <AuthModal
            authState={inAppAuthState}
            onClose={() => setInAppAuthState(null)}
            onConsumerEnter={handleInAppConsumerEnter}
            onTalentVerified={handleInAppTalentVerified}
            onPromoterVerified={handleInAppPromoterVerified}
            onMockLogin={handleInAppMockLogin}
          />
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Everything above this line is the Consumer Hub / Talent Pass Hub
   merge exactly as previously delivered - unchanged except for the
   two additive edits noted at the top of this file's changelog.

   Everything below is new: the public Landing Page, now the app's
   entry point, plus the KYC pre-fill flow and the VibePassRoot gate
   that hands off into the shell above once sign-in/verification
   completes.
   ================================================================ */

/* ------------------------------------------------------------------ */
/* Landing Page - typography                                          */
/* Injected at runtime via a Google Fonts <link>, with a graceful      */
/* fallback to system UI sans if the request fails; never blocks      */
/* render. Scoped to the landing page only - the app shell above       */
/* keeps its own existing font stack untouched.                        */
/* ------------------------------------------------------------------ */
const FONT_DISPLAY = "'Unbounded', 'Segoe UI', sans-serif";
const FONT_BODY = "'Plus Jakarta Sans', 'Segoe UI', sans-serif";
const FONT_MONO = "'Space Mono', 'Courier New', monospace";
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap";

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ------------------------------------------------------------------ */
/* Content data                                                       */
/* ------------------------------------------------------------------ */
const NAV_LINKS = [
  { id: "events", label: "Events" },
  { id: "spots", label: "Venues & Spots" },
  { id: "talent", label: "Talent Directory" },
];

const KIND_MAP = { events: "event", spots: "spot", talent: "talent" };

const PILLS = [
  { id: "trending", label: "Trending Events", emoji: "\u{1F525}" },
  { id: "cafes", label: "Specialty Cafes", emoji: "\u2615" },
  { id: "djs", label: "DJs & Artists", emoji: "\u{1F3A7}" },
  { id: "dining", label: "Diners & Dining", emoji: "\u{1F37D}\uFE0F" },
  { id: "cultural", label: "Cultural & Tech", emoji: "\u{1F3DB}\uFE0F" },
];

const FEATURES = [
  {
    icon: Compass,
    title: "Consumer Experience",
    desc: "Browse Abu Dhabi's curated events, cafes, diners and nightlife freely - no account, no wallet, no gatekeeping until you're ready to unlock a digital pass or claim an exclusive perk.",
  },
  {
    icon: Users,
    title: "Talent Access",
    desc: "Talent Pass verification, guestlist management and on-time payouts - one trusted profile for every booking, across every venue, on every night.",
  },
];

const ROLES = [
  { id: "fan", label: "Fan / Consumer", icon: Ticket },
  { id: "talent", label: "Creator / Talent", icon: Sparkles },
  { id: "promoter", label: "Promoter / Venue", icon: Building2 },
];

/* Which marketing-page content variant is showing (portalMode), not to
   be confused with ROLES (which auth-modal tab is selected) - related
   concepts, kept separate rather than conflated into one array. */
const PORTAL_OPTIONS = [
  { id: "discover", label: "Fan Discovery", icon: Compass },
  { id: "talent", label: "Talent Pass", icon: Sparkles },
  { id: "promoter", label: "Partner Portal", icon: Building2 },
];

const AUTH_METHODS = [
  {
    id: "uaepass",
    title: "UAE Pass",
    sub: "Fastest - government-verified digital identity",
    icon: Fingerprint,
    accent: C.emerald,
    badge: "Recommended",
  },
  {
    id: "email",
    title: "Email / Social",
    sub: "Google, Apple & email - one-tap sign in",
    icon: Mail,
    accent: C.textHi,
  },
  {
    id: "card",
    title: "Apple Pay / Card",
    sub: "Pay instantly, verify identity at checkout",
    icon: CreditCard,
    accent: C.gold,
  },
];

/* Presentation-mode mock data: pre-filled KYC + dashboard content so a
   live demo never stalls on typing, file pickers, or empty states. */
const KYC_DOCUMENTS = [
  { id: "eid_front", label: "Emirates ID (Front)", filename: "eid_front_verified.pdf" },
  { id: "eid_back", label: "Emirates ID (Back)", filename: "eid_back_verified.pdf" },
  { id: "visa", label: "UAE Residency Visa", filename: "visa_verified.pdf" },
  { id: "passport", label: "Passport Copy", filename: "passport_verified.jpg" },
];

const TALENT_MOCK_PROFILE = {
  stageName: "DJ Alex \u2013 Deep House",
  emiratesId: "784-1994-1234567-1",
  portfolioUrl: "soundcloud.com/dj-alex-deephouse",
  specialty: "Deep House Selector",
};

const CONSUMER_MOCK_PROFILE = {
  name: "Alexander Wright",
  email: "alex.w@vibepass.ae",
  phone: "+971 50 123 4567",
};

/* Business name matches the identity already shown in the Promoter
   Enterprise Controller's own header ("Falcon Hospitality Group, 3
   active locations under management"), so registration and the
   in-hub identity agree instead of introducing a second, competing
   demo business. */
const PROMOTER_MOCK_PROFILE = {
  businessName: "Falcon Hospitality Group",
  contactName: "Khalid Al Mazrouei",
  contactEmail: "khalid@falconhospitality.ae",
  contactPhone: "+971 50 987 6543",
  permitNumber: "DCT-AD-2026-55102",
};

/* Three additional promoter businesses, distinct from the single
   PROMOTER_MOCK_PROFILE identity used for registration/KYC. These
   exist so Talent's future search (Nav-7) has real promoter names to
   search against - a lighter shape than PROMOTER_MOCK_PROFILE since
   none of these go through the registration flow, they're purely
   discoverable directory entries. Each also organizes a subset of the
   new events added in Nav-4, via that event's own `organizer` field,
   so a promoter's presence in the app is grounded in real content
   rather than a name with nothing behind it. */
const PROMOTER_DIRECTORY = [
  {
    id: "oryx-live",
    businessName: "Oryx Live Entertainment",
    focus: "Nightlife & Comedy",
    permitNumber: "DCT-AD-2026-71203",
    blurb: "Abu Dhabi's rooftop and comedy-night specialists, running weekly DJ sets and a growing stand-up circuit.",
  },
  {
    id: "saffron-arts",
    businessName: "Saffron Arts Collective",
    focus: "Arts, Fashion & Culture",
    permitNumber: "DCT-AD-2026-71412",
    blurb: "A curatorial collective behind gallery exhibitions, fashion showcases and hands-on craft workshops across Abu Dhabi's creative spaces.",
  },
  {
    id: "meridian-business",
    businessName: "Meridian Business Circle",
    focus: "Business, Wellness & Family",
    permitNumber: "DCT-AD-2026-71501",
    blurb: "Community-first events spanning founder summits, wellness festivals and family days across Abu Dhabi and Dubai.",
  },
];

/* A browsable roster of talent, distinct from TALENT (the logged-in
   Talent Pass holder's own dashboard identity - "Marcus Reyes") and
   from the single "DJ Alex" persona used for the registration demo.
   This is what Promoter's future Talent Search (Nav-8) browses - a
   promoter looking to hire, not a talent's own profile. `category`
   reuses the exact same ids as FILTERS/CATEGORY_LABELS rather than a
   separate taxonomy, so talent and events can eventually be
   cross-filtered by the same categories. avatarInitial (not a photo)
   matches the established TALENT.avatarInitial convention - using
   real, anonymous stock headshots to represent named fictional people
   is a heavier and more sensitive choice than the letter-avatar
   pattern already used throughout this app. */
const TALENT_ROSTER = [
  {
    id: "talent-dj-priya",
    name: "DJ Priya \u2018Neon\u2019 Sharma",
    specialty: "DJ / Music Producer",
    category: "nightlife",
    avatarInitial: "P",
    rating: 4.8,
    ratePerEvent: 1400,
    basedIn: "Abu Dhabi",
    bio: "Deep house and Afro-tech sets built for rooftop crowds, resident at three Abu Dhabi lounges since 2024.",
    portfolioUrl: "instagram.com/djpriya.neon",
  },
  {
    id: "talent-dj-karim",
    name: "DJ Karim El-Sayed",
    specialty: "DJ / Music Producer",
    category: "concerts",
    avatarInitial: "K",
    rating: 4.9,
    ratePerEvent: 1650,
    basedIn: "Dubai",
    bio: "Festival-scale main-stage sets spanning progressive house to Arabic-fusion remixes.",
    portfolioUrl: "soundcloud.com/karimelsayed",
  },
  {
    id: "talent-velvet-collective",
    name: "The Velvet Collective",
    specialty: "Live Band (4-piece)",
    category: "concerts",
    avatarInitial: "V",
    rating: 4.7,
    ratePerEvent: 3200,
    basedIn: "Abu Dhabi",
    bio: "Soul, funk and Motown covers with a horn section - a regular fixture at hotel galas and corporate launches.",
    portfolioUrl: "instagram.com/velvetcollectiveband",
  },
  {
    id: "talent-sofia-marchetti",
    name: "Sofia Marchetti",
    specialty: "Vocalist / Live Musician",
    category: "dining",
    avatarInitial: "S",
    rating: 4.9,
    ratePerEvent: 1100,
    basedIn: "Dubai",
    bio: "Jazz-lounge vocals and acoustic sets, a regular at Sunday brunches across Downtown Dubai.",
    portfolioUrl: "instagram.com/sofiasingsdxb",
  },
  {
    id: "talent-ahmed-alzaabi",
    name: "Ahmed Al Zaabi",
    specialty: "MC / Event Host",
    category: "business",
    avatarInitial: "A",
    rating: 4.8,
    ratePerEvent: 1800,
    basedIn: "Abu Dhabi",
    bio: "Bilingual Arabic-English host for summits, galas and product launches, ten years on Abu Dhabi's corporate circuit.",
    portfolioUrl: "linkedin.com/in/ahmedalzaabi-host",
  },
  {
    id: "talent-grace-fernandes",
    name: "Grace Fernandes",
    specialty: "Event Photographer",
    category: "wide",
    avatarInitial: "G",
    rating: 4.9,
    ratePerEvent: 950,
    basedIn: "Abu Dhabi",
    bio: "Candid coverage for weddings, brand activations and nightlife - same-week gallery turnaround.",
    portfolioUrl: "instagram.com/gracefernandes.photo",
  },
  {
    id: "talent-kenji-watanabe",
    name: "Kenji Watanabe",
    specialty: "Videographer / Content Creator",
    category: "wide",
    avatarInitial: "K",
    rating: 4.7,
    ratePerEvent: 1300,
    basedIn: "Dubai",
    bio: "Same-day recap reels and multi-cam event coverage for brands and promoters across Dubai.",
    portfolioUrl: "instagram.com/kenji.frames",
  },
  {
    id: "talent-layla-osman",
    name: "Layla Osman",
    specialty: "Dancer / Choreographer",
    category: "nightlife",
    avatarInitial: "L",
    rating: 4.8,
    ratePerEvent: 1050,
    basedIn: "Dubai",
    bio: "Contemporary and Afro-fusion dance crew lead, booked for launch parties and festival stages.",
    portfolioUrl: "instagram.com/laylamoves",
  },
  {
    id: "talent-amara-okafor",
    name: "Amara Okafor",
    specialty: "Runway & Editorial Model",
    category: "fashion",
    avatarInitial: "A",
    rating: 4.9,
    ratePerEvent: 1500,
    basedIn: "Dubai",
    bio: "Runway and campaign work for regional fashion weeks, represented across the GCC since 2023.",
    portfolioUrl: "instagram.com/amara.okafor",
  },
  {
    id: "talent-dario-rossi",
    name: "Chef Dario Rossi",
    specialty: "Live Culinary Talent",
    category: "dining",
    avatarInitial: "D",
    rating: 4.9,
    ratePerEvent: 2200,
    basedIn: "Abu Dhabi",
    bio: "Live pasta and risotto stations for private dinners and hotel activations, ex-fine-dining Rome and Dubai.",
    portfolioUrl: "instagram.com/chefdariorossi",
  },
  {
    id: "talent-fatima-alhashimi",
    name: "Dr. Fatima Al Hashimi",
    specialty: "Keynote Speaker / Panelist",
    category: "business",
    avatarInitial: "F",
    rating: 5.0,
    ratePerEvent: 2800,
    basedIn: "Abu Dhabi",
    bio: "Fintech and sustainability keynotes for summits and founder events across the UAE and Saudi Arabia.",
    portfolioUrl: "linkedin.com/in/drfatimaalhashimi",
  },
  {
    id: "talent-isabelle-laurent",
    name: "Isabelle Laurent",
    specialty: "Event Stylist / Florist",
    category: "fashion",
    avatarInitial: "I",
    rating: 4.8,
    ratePerEvent: 1750,
    basedIn: "Dubai",
    bio: "Floral installations and tablescape styling for runway shows, weddings and brand launches.",
    portfolioUrl: "instagram.com/isabellelaurent.style",
  },
  {
    id: "talent-rashid-comedy",
    name: "Rashid \u2018Loud\u2019 Hassan",
    specialty: "Stand-Up Comedian",
    category: "comedy",
    avatarInitial: "R",
    rating: 4.7,
    ratePerEvent: 900,
    basedIn: "Abu Dhabi",
    bio: "Observational sets on expat life in the Gulf, regular on Abu Dhabi's growing comedy-night circuit.",
    portfolioUrl: "instagram.com/rashidloud",
  },
  {
    id: "talent-meera-krishnan",
    name: "Meera Krishnan",
    specialty: "Yoga & Wellness Instructor",
    category: "wellness",
    avatarInitial: "M",
    rating: 4.9,
    ratePerEvent: 700,
    basedIn: "Abu Dhabi",
    bio: "Vinyasa and sound-bath sessions for corporate wellness days and beachfront retreats.",
    portfolioUrl: "instagram.com/meera.flows",
  },
  {
    id: "talent-tomas-silva",
    name: "Tom\u00e1s \u2018The Amazing\u2019 Silva",
    specialty: "Kids Entertainer / Magician",
    category: "family",
    avatarInitial: "T",
    rating: 4.8,
    ratePerEvent: 850,
    basedIn: "Dubai",
    bio: "Close-up magic and balloon art for family days, birthdays and mall activations across Dubai.",
    portfolioUrl: "instagram.com/tomasamazing",
  },
];

/* Landing page event scheduling. Every event now carries a `schedule`
   instead of a hardcoded date/time string, so the "Trending Today"
   module never goes stale - a hardcoded "Fri, 24 Jul" would only ever
   be true on one real calendar date and would show empty every other
   day this demo is actually run.
   Three shapes, one function each way:
   - "fixed"  { daysFromNow, time } - a one-time event N days out
   - "daily"  { times: [...] }      - a recurring public spectacle
                                       with several showtimes a day
   - "weekly" { weekday, time }     - a weekly promo (weekday: 0=Sun)
   nextOccurrence() answers "when does this next happen" for all
   three uniformly, so Trending ranking (Batch 2) and card display
   both call one thing regardless of event type. Building the target
   time via setHours() on a local Date - rather than parsing a date
   string - avoids the classic pitfall where a bare date string parses
   as UTC midnight and silently displays a day early in this timezone. */
function nextOccurrence(schedule, now) {
  const base = now || new Date();
  if (schedule.type === "daily") {
    const todaysTimes = schedule.times
      .map((t) => {
        const [hh, mm] = t.split(":").map(Number);
        const d = new Date(base);
        d.setHours(hh, mm, 0, 0);
        return d;
      })
      .sort((a, b) => a - b);
    const upcoming = todaysTimes.find((d) => d.getTime() > base.getTime());
    if (upcoming) return upcoming;
    const [hh, mm] = schedule.times[0].split(":").map(Number);
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    d.setHours(hh, mm, 0, 0);
    return d;
  }
  if (schedule.type === "weekly") {
    const [hh, mm] = schedule.time.split(":").map(Number);
    let daysUntil = (schedule.weekday - base.getDay() + 7) % 7;
    if (daysUntil === 0) {
      const todayAtTime = new Date(base);
      todayAtTime.setHours(hh, mm, 0, 0);
      if (todayAtTime.getTime() <= base.getTime()) daysUntil = 7;
    }
    const d = new Date(base);
    d.setDate(d.getDate() + daysUntil);
    d.setHours(hh, mm, 0, 0);
    return d;
  }
  // "fixed"
  const [hh, mm] = schedule.time.split(":").map(Number);
  const d = new Date(base);
  d.setDate(d.getDate() + schedule.daysFromNow);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/* Derives display-ready {date, time} strings from a schedule, in the
   same "Fri, 24 Jul" / "20:00" shape every card already renders - so
   EventPreviewCard, PreviewGrid's search, and EventDetailModal need
   zero changes; they just receive computed strings instead of
   hardcoded ones. 24-hour time to match the HH:MM convention already
   used everywhere else in this file (main app included). */
function scheduleDisplay(schedule, now) {
  const base = now || new Date();
  const next = nextOccurrence(schedule, base);
  const timeLabel = `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
  if (schedule.type === "daily") {
    return { date: "Daily", time: `Next show ${timeLabel}` };
  }
  const startOfToday = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const startOfNext = new Date(next.getFullYear(), next.getMonth(), next.getDate());
  const dayDiff = Math.round((startOfNext - startOfToday) / 86400000);
  let dateLabel;
  if (dayDiff === 0) dateLabel = "Today";
  else if (dayDiff === 1) dateLabel = "Tomorrow";
  else {
    const weekday = next.toLocaleDateString("en-US", { weekday: "short" });
    const day = next.getDate();
    const month = next.toLocaleDateString("en-US", { month: "short" });
    dateLabel = `${weekday}, ${day} ${month}`;
  }
  if (schedule.type === "weekly") dateLabel = `${dateLabel} \u00b7 Weekly`;
  return { date: dateLabel, time: timeLabel };
}

/* Simulated location for the "Today" proximity window (Batch 4) -
   consistent with how the rest of this demo already handles location
   (mock data, not a live geolocation prompt) and grounded at the same
   Abu Dhabi coordinate the main app's DiscoveryMap already centers on,
   rather than an arbitrary new point. */
const MOCK_USER_LOCATION = { lat: INITIAL_CENTER[0], lng: INITIAL_CENTER[1] };

const TICKER_ITEMS = [
  "Permit DCT-AD-2026-88410 verified \u2014 Neon Pulse Festival, Yas Island",
  "Talent Pass issued \u2014 DJ Alex, Deep House Selector",
  "Escrow settled \u2014 AED 1.24M in Vibe Tickets this week",
  "ADGM-registered venue verified \u2014 Amethyst Sky Lounge",
  "12,400 Vibe Passes minted this month",
  "MoHRE work-permit check cleared \u2014 Talent Pass verification",
  "UAE Pass verification \u2014 98.7% pass rate, sub-9s average",
  "New collectible drop \u2014 Saadiyat Symphony proof-of-attendance",
];

const PREVIEW_ITEMS = [
  {
    id: "p-neon-pulse",
    kind: "event",
    pill: "trending",
    title: "Neon Pulse Festival",
    zone: "Yas Island",
    schedule: { type: "fixed", daysFromNow: 3, time: "20:00" },
    price: 295,
    ticketOptions: [{ left: 22 }],
    lat: 24.47,
    lng: 54.605,
    tag: "Headline Concert",
    blurb:
      "Yas Island's headline night returns with a multi-stage lineup, immersive lighting rigs, and a sound system built for the open air. Doors open at sunset.",
    accent: C.emerald,
    gallery: [
      { src: "https://images.pexels.com/photos/36675302/pexels-photo-36675302.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Music2 },
      { src: "https://images.pexels.com/photos/18447992/pexels-photo-18447992.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
      { src: "https://images.pexels.com/photos/6782458/pexels-photo-6782458.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Zap },
      { src: "https://images.pexels.com/photos/1047443/pexels-photo-1047443.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Users },
    ],
  },
  {
    id: "p-finance-week",
    kind: "event",
    pill: "cultural",
    title: "Abu Dhabi Finance Week: Founders Night",
    zone: "Al Maryah Island",
    schedule: { type: "fixed", daysFromNow: 8, time: "18:30" },
    price: 180,
    ticketOptions: [{ left: 140 }],
    lat: 24.499,
    lng: 54.3853,
    tag: "Tech & Capital",
    blurb:
      "An invite-only rooftop gathering for the capital's founders, investors, and policy leaders, closing out Finance Week with skyline views and curated conversation.",
    accent: C.amethyst,
    gallery: [
      { src: "https://images.pexels.com/photos/10554403/pexels-photo-10554403.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Building2 },
      { src: "https://images.pexels.com/photos/4664063/pexels-photo-4664063.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: TrendingUp },
      { src: "https://images.pexels.com/photos/3075993/pexels-photo-3075993.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Landmark },
      { src: "https://images.pexels.com/photos/2246476/pexels-photo-2246476.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Briefcase },
    ],
  },
  {
    id: "p-sunset-beach",
    kind: "event",
    pill: "trending",
    title: "Sunset Beach Club Party",
    zone: "Saadiyat Cultural District",
    schedule: { type: "fixed", daysFromNow: 0, time: "17:00" },
    price: 150,
    ticketOptions: [{ left: 9 }],
    lat: 24.54,
    lng: 54.43,
    tag: "Beach Live",
    blurb:
      "Golden-hour DJ sets, poolside lounging, and a full beach-club spread on Saadiyat's coastline as the sun goes down over the Gulf.",
    accent: C.emerald,
    gallery: [
      { src: "https://images.pexels.com/photos/261181/pexels-photo-261181.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sun },
      { src: "https://images.pexels.com/photos/28408327/pexels-photo-28408327.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Waves },
      { src: "https://images.pexels.com/photos/23091906/pexels-photo-23091906.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: PartyPopper },
      { src: "https://images.pexels.com/photos/8467763/pexels-photo-8467763.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Gem },
    ],
  },
  {
    id: "p-qasr-lights",
    kind: "event",
    pill: "cultural",
    title: "Qasr Al Watan: Palace Lights Tour",
    zone: "Al Ras Al Akhdar",
    schedule: { type: "fixed", daysFromNow: 1, time: "19:00" },
    price: 65,
    ticketOptions: [{ left: 65 }],
    lat: 24.4353,
    lng: 54.3172,
    tag: "Cultural Site",
    blurb:
      "An after-dark walk through the Presidential Palace's illuminated halls and gardens, tracing UAE history through light, sound, and architecture.",
    accent: C.amethyst,
    gallery: [
      { src: "https://images.pexels.com/photos/22458431/pexels-photo-22458431.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Landmark },
      { src: "https://images.pexels.com/photos/16013193/pexels-photo-16013193.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Crown },
      { src: "https://images.pexels.com/photos/34246953/pexels-photo-34246953.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
      { src: "https://images.pexels.com/photos/30466253/pexels-photo-30466253.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Building2 },
    ],
  },
  /* ---- Real, permanent Abu Dhabi/Dubai landmarks (Batch 1, section 1) ---- */
  {
    id: "p-louvre-ad",
    kind: "event",
    pill: "cultural",
    title: "Louvre Abu Dhabi: After-Hours Art Walk",
    zone: "Saadiyat Island",
    schedule: { type: "fixed", daysFromNow: 2, time: "18:00" },
    price: 70,
    ticketOptions: [{ left: 85 }],
    lat: 24.5325,
    lng: 54.3986,
    tag: "Museum",
    blurb:
      "Jean Nouvel's landmark dome after the day crowds clear - a guided evening walk through galleries bridging Eastern and Western art, capped by the dome's famous rain-of-light effect.",
    accent: C.emerald,
    gallery: [
      { src: "https://images.pexels.com/photos/15127414/pexels-photo-15127414.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Landmark },
      { src: "https://images.pexels.com/photos/33678826/pexels-photo-33678826.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
      { src: "https://images.pexels.com/photos/17861187/pexels-photo-17861187.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Building2 },
      { src: "https://images.pexels.com/photos/22674234/pexels-photo-22674234.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Waves },
    ],
  },
  {
    id: "p-zayed-mosque",
    kind: "event",
    pill: "cultural",
    title: "Sheikh Zayed Grand Mosque: Heritage Twilight Tour",
    zone: "Abu Dhabi",
    schedule: { type: "fixed", daysFromNow: 1, time: "17:30" },
    price: 40,
    ticketOptions: [{ left: 110 }],
    lat: 24.4128,
    lng: 54.475,
    tag: "Cultural Site",
    blurb:
      "A guided walk through one of the world's largest mosques as the marble courtyards catch the last light - reflection pools, hand-knotted carpets, and chandeliers found nowhere else.",
    accent: C.amethyst,
    gallery: [
      { src: "https://images.pexels.com/photos/33687823/pexels-photo-33687823.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Landmark },
      { src: "https://images.pexels.com/photos/24862684/pexels-photo-24862684.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Crown },
      { src: "https://images.pexels.com/photos/35284991/pexels-photo-35284991.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
      { src: "https://images.pexels.com/photos/33105187/pexels-photo-33105187.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Building2 },
    ],
  },
  {
    id: "p-ferrari-world",
    kind: "event",
    pill: "cultural",
    title: "Ferrari World Abu Dhabi: Full-Throttle Day Pass",
    zone: "Yas Island",
    schedule: { type: "fixed", daysFromNow: 5, time: "10:00" },
    price: 345,
    ticketOptions: [{ left: 200 }],
    lat: 24.4838,
    lng: 54.607,
    tag: "Theme Park",
    blurb:
      "Home of Formula Rossa, the launch coaster that hits 240 km/h in under five seconds, under the world's largest theme-park roof. A full day of racing-themed rides on Yas Island.",
    accent: C.emerald,
    gallery: [
      { src: "https://images.pexels.com/photos/17077313/pexels-photo-17077313.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Zap },
      { src: "https://images.pexels.com/photos/16545569/pexels-photo-16545569.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Flame },
      { src: "https://images.pexels.com/photos/20143380/pexels-photo-20143380.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
      { src: "https://images.pexels.com/photos/1047443/pexels-photo-1047443.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Users },
    ],
  },
  /* ---- Recurring public spectacle - "daily" schedule, several
     showtimes per evening, matching how the real Dubai Fountain runs.
     Free to watch, so price is 0 and ticketOptions.left is a nominal
     high number representing open viewing space, not sold tickets. ---- */
  {
    id: "p-dubai-fountain",
    kind: "event",
    pill: "cultural",
    title: "The Dubai Fountain: Water & Light Show",
    zone: "Downtown Dubai",
    schedule: { type: "daily", times: ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"] },
    price: 0,
    ticketOptions: [{ left: 999 }],
    lat: 25.1944,
    lng: 55.2734,
    tag: "Free Public Spectacle",
    blurb:
      "The world's largest choreographed fountain system, on Burj Khalifa Lake - jets reaching 150m, set to music, running every 30 minutes each evening. No ticket needed, just a spot by the lake.",
    accent: C.amethyst,
    gallery: [
      { src: "https://images.pexels.com/photos/31730725/pexels-photo-31730725.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Waves },
      { src: "https://images.pexels.com/photos/19756845/pexels-photo-19756845.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
      { src: "https://images.pexels.com/photos/29493118/pexels-photo-29493118.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Building2 },
      { src: "https://images.pexels.com/photos/9637056/pexels-photo-9637056.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Landmark },
    ],
  },
  /* ---- Weekly promos - fictional offers, real seeded venues (section
     1: "attached to VibePass's own existing seeded venues, not real
     businesses"). Weekdays picked to match how these formats actually
     run regionally: Ladies Night midweek, brunch on Friday, happy
     hour early evening. ---- */
  {
    id: "p-ladies-night-amethyst",
    kind: "event",
    pill: "trending",
    title: "Ladies Night at Amethyst Sky Lounge",
    zone: "Al Maryah Island",
    schedule: { type: "weekly", weekday: 3, time: "21:00" },
    price: 0,
    ticketOptions: [{ left: 60 }],
    lat: 24.499,
    lng: 54.3853,
    tag: "Weekly Promo",
    blurb:
      "Complimentary entry and a curated drinks selection for the ladies every Wednesday - the same low-lit terrace and house mixes Amethyst Sky Lounge is known for, on the capital's biggest midweek night out.",
    accent: C.amethyst,
    gallery: [
      { src: "https://images.pexels.com/photos/34009280/pexels-photo-34009280.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Crown },
      { src: "https://images.pexels.com/photos/5863513/pexels-photo-5863513.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Wine },
      { src: "https://images.pexels.com/photos/33588956/pexels-photo-33588956.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
    ],
  },
  {
    id: "p-brunch-marina-fuoco",
    kind: "event",
    pill: "dining",
    title: "Brunch Fridays at Marina Fuoco",
    zone: "Marina",
    schedule: { type: "weekly", weekday: 5, time: "12:30" },
    price: 320,
    ticketOptions: [{ left: 40 }],
    lat: 24.498,
    lng: 54.405,
    tag: "Weekly Promo",
    blurb:
      "Free-flowing brunch every Friday - Marina Fuoco's wood-fired kitchen runs a full sharing menu from midday, in the same waterfront dining room the venue is known for the rest of the week.",
    accent: C.gold,
    gallery: [
      { src: "https://images.pexels.com/photos/28408327/pexels-photo-28408327.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: UtensilsCrossed },
      { src: "https://images.pexels.com/photos/261181/pexels-photo-261181.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sun },
      { src: "https://images.pexels.com/photos/23091906/pexels-photo-23091906.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: PartyPopper },
    ],
  },
  {
    id: "p-happy-hour-solace",
    kind: "event",
    pill: "trending",
    title: "Happy Hour at Solace Beach Club",
    zone: "Saadiyat Cultural District",
    schedule: { type: "weekly", weekday: 2, time: "17:00" },
    price: 0,
    ticketOptions: [{ left: 75 }],
    lat: 24.545,
    lng: 54.42,
    tag: "Weekly Promo",
    blurb:
      "Two-for-one on Solace's signature pours every Tuesday from 5pm, poolside as the sun drops over the coastline - the same golden-hour crowd, at the week's easiest excuse to start early.",
    accent: C.emerald,
    gallery: [
      { src: "https://images.pexels.com/photos/8467763/pexels-photo-8467763.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Gem },
      { src: "https://images.pexels.com/photos/18447992/pexels-photo-18447992.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
      { src: "https://images.pexels.com/photos/6782458/pexels-photo-6782458.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Waves },
    ],
  },
  {
    id: "p-dj-alex",
    kind: "talent",
    pill: "djs",
    name: "DJ Alex",
    specialty: "Deep House Selector",
    rating: "4.9",
    spotlight: "Headlining Neon Pulse Festival",
    nextDates: [
      `${dayLabel(34)} - Yas Island`,
      `${dayLabel(96)} - Khalifa City`,
      `${dayLabel(158)} - Corniche`,
    ],
    accent: C.emerald,
  },
  {
    id: "p-elena",
    kind: "talent",
    pill: "cafes",
    name: "Elena",
    specialty: "Specialty Barista & Latte Artist",
    rating: "4.8",
    spotlight: "Resident at Kopi Roastery",
    nextDates: [
      "Daily - Al Reem Island",
      `${dayLabel(62)} - Guest pour-over, Saadiyat`,
      `${dayLabel(124)} - Latte-art workshop`,
    ],
    accent: C.gold,
  },
  {
    id: "p-yusuf",
    kind: "talent",
    pill: "djs",
    name: "Yusuf Rahman",
    specialty: "Resident Techno Selector",
    rating: "4.7",
    spotlight: "Every Friday - Full Throttle Afterparty",
    nextDates: [
      `${dayLabel(41)} - Yas Marina`,
      `${dayLabel(103)} - Khalifa City`,
      `${dayLabel(166)} - Yas Bay`,
    ],
    accent: C.amethyst,
  },
  {
    id: "p-kopi",
    kind: "spot",
    pill: "cafes",
    title: "Kopi Roastery",
    category: "Specialty Cafe",
    zone: "Al Reem Island",
    rating: "4.9",
    reviews: 460,
    perk: "10% off with Vibe Pass",
    blurb:
      "A single-origin roastery and pour-over bar with house-roasted beans, communal wooden tables, and a menu built around slow, deliberate coffee.",
    accent: C.emerald,
    gallery: [
      { src: "https://images.pexels.com/photos/15403541/pexels-photo-15403541.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Coffee },
      { src: "https://images.pexels.com/photos/30630942/pexels-photo-30630942.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
      { src: "https://images.pexels.com/photos/29516134/pexels-photo-29516134.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Star },
    ],
  },
  {
    id: "p-amethyst-lounge",
    kind: "spot",
    pill: "trending",
    title: "Amethyst Sky Lounge",
    category: "VIP Lounge",
    zone: "Al Maryah Island",
    rating: "4.8",
    reviews: 620,
    perk: "Skip-the-line entry with Vibe Pass",
    blurb:
      "A members-leaning cocktail lounge with low lighting, curated house mixes, and a late-night crowd that spills onto a private terrace.",
    accent: C.amethyst,
    gallery: [
      { src: "https://images.pexels.com/photos/34009280/pexels-photo-34009280.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Crown },
      { src: "https://images.pexels.com/photos/5863513/pexels-photo-5863513.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Moon },
      { src: "https://images.pexels.com/photos/33588956/pexels-photo-33588956.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
    ],
  },
  {
    id: "p-dhow-ember",
    kind: "spot",
    pill: "dining",
    title: "Dhow & Ember",
    category: "Diner - Charcoal Grill",
    zone: "Corniche",
    rating: "4.7",
    reviews: 980,
    perk: "Complimentary valet with Vibe Pass",
    blurb:
      "Open-flame grilling and slow-smoked mains served in a warm, wood-lined dining room overlooking the Corniche waterfront.",
    accent: C.emerald,
    gallery: [
      { src: "https://images.pexels.com/photos/12261087/pexels-photo-12261087.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Flame },
      { src: "https://images.pexels.com/photos/3997609/pexels-photo-3997609.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: UtensilsCrossed },
      { src: "https://images.pexels.com/photos/533325/pexels-photo-533325.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
    ],
  },
  {
    id: "p-marina-fuoco",
    kind: "spot",
    pill: "dining",
    title: "Marina Fuoco",
    category: "Diner - Waterfront Trattoria",
    zone: "Yas Island",
    rating: "4.5",
    reviews: 730,
    perk: "Free dessert with Vibe Pass",
    blurb:
      "A wood-fired Italian trattoria on the water, pairing handmade pasta and coastal seafood with marina views at every table.",
    accent: C.amethyst,
    gallery: [
      { src: "https://images.pexels.com/photos/18090414/pexels-photo-18090414.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Waves },
      { src: "https://images.pexels.com/photos/4876523/pexels-photo-4876523.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: UtensilsCrossed },
      { src: "https://images.pexels.com/photos/14071317/pexels-photo-14071317.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sparkles },
    ],
  },
  {
    id: "p-solace",
    kind: "spot",
    pill: "trending",
    title: "Solace Beach Club",
    category: "Beach Club",
    zone: "Saadiyat Cultural District",
    rating: "4.6",
    reviews: 1400,
    perk: "Free daybed upgrade with Vibe Pass",
    blurb:
      "Private daybeds, a saltwater pool, and a barefoot-luxury menu steps from Saadiyat's coastline - built for slow, sun-soaked afternoons.",
    accent: C.emerald,
    gallery: [
      { src: "https://images.pexels.com/photos/31359181/pexels-photo-31359181.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Sun },
      { src: "https://images.pexels.com/photos/6437583/pexels-photo-6437583.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Waves },
      { src: "https://images.pexels.com/photos/29786791/pexels-photo-29786791.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop", icon: Gem },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Trending selection (build spec section 2)                          */
/* Combines two signals already present on every event - no new       */
/* analytics/tracking needed: scarcity (ticketOptions[].left) and      */
/* urgency (how soon nextOccurrence() falls). Verified directly        */
/* against PREVIEW_ITEMS: no event currently carries a demand-style    */
/* tag like "Selling Fast", so the spec's optional third signal        */
/* doesn't apply yet - ranking runs on scarcity + urgency alone.       */
/* One scoring function serves both "Today" and "Upcoming" (section    */
/* 3); they differ only in which pool of events is considered first,   */
/* never in how a candidate is scored once it's in that pool.          */
/* ------------------------------------------------------------------ */

/* Sooner start = higher urgency. Floors at 15 minutes so an
   already-open daily show (next occurrence only a few minutes out)
   scores very high without dividing by a near-zero number. */
function eventUrgencyScore(hoursUntilStart) {
  const h = Math.max(hoursUntilStart, 0.25);
  return 100 / h;
}

/* Fewer tickets left = higher scarcity. Same shape as urgency: an
   inverse curve, floored at 1 remaining so a hypothetical sold-out
   edge case can't divide by zero. */
function eventScarcityScore(left) {
  const remaining = Math.max(left, 1);
  return 1000 / remaining;
}

function trendingScore(event, now) {
  const next = nextOccurrence(event.schedule, now);
  const hoursUntilStart = (next.getTime() - now.getTime()) / 3600000;
  const left = event.ticketOptions && event.ticketOptions[0] ? event.ticketOptions[0].left : 999;
  return eventScarcityScore(left) + eventUrgencyScore(hoursUntilStart);
}

/* "Today" per section 3's own definition: happening today, by
   calendar date. The tighter proximity-based window from section 4
   (30min-3h before start, depending on distance) further filters
   which of today's events are visible RIGHT NOW - that's a Batch 4
   concern layered on top of this pool, not a change to it. */
function isHappeningToday(event, now) {
  const next = nextOccurrence(event.schedule, now);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNext = new Date(next.getFullYear(), next.getMonth(), next.getDate());
  return startOfNext.getTime() === startOfToday.getTime();
}

/* Section 4: how far ahead of an event's start it becomes visible in
   "Today", based on distance from the mock user location - nearer
   means less lead time is needed (a 30-minute trip needs less notice
   than a cross-city one), farther means more. Distance bands are the
   spec's own starting proposal for Abu Dhabi/Dubai scale, kept as one
   small function so they're easy to retune without touching the
   filtering logic itself. */
function todayVisibilityWindowHours(distanceKm) {
  if (distanceKm < 5) return 0.5;
  if (distanceKm <= 15) return 2;
  return 3;
}

/* Section 4's actual gate for the "Today" pool: happening today AND
   either already started (stays visible for the rest of the day - a
   multi-hour party or show doesn't vanish from Trending the instant
   its start time passes) or within the proximity-adjusted pre-start
   window. Events without coordinates fall back to the spec's own
   "Default / far" 3-hour window rather than being silently excluded. */
function isVisibleToday(event, now, userLocation) {
  if (!isHappeningToday(event, now)) return false;
  const next = nextOccurrence(event.schedule, now);
  const hoursUntilStart = (next.getTime() - now.getTime()) / 3600000;
  if (hoursUntilStart <= 0) return true;
  if (typeof event.lat !== "number" || typeof event.lng !== "number") return hoursUntilStart <= 3;
  const distanceKm = haversineMeters(userLocation.lat, userLocation.lng, event.lat, event.lng) / 1000;
  return hoursUntilStart <= todayVisibilityWindowHours(distanceKm);
}

/* Returns the top 3 event-kind items for the given window ("today" |
   "upcoming"), ranked by trendingScore. Pure function: no state, no
   side effects, same output for the same items/window/now/userLocation
   - callable from the swipeable module (Batch 3) or a test harness
   identically. "Today" additionally applies the proximity-based
   visibility window (section 4); "Upcoming" is untouched by
   proximity, per section 4's own scoping to the Today list only. */
function getTrendingEvents(items, window, now, userLocation) {
  const base = now || new Date();
  const location = userLocation || MOCK_USER_LOCATION;
  const pool = items.filter((it) => {
    if (it.kind !== "event" || !it.schedule) return false;
    if (window === "today") return isVisibleToday(it, base, location);
    const next = nextOccurrence(it.schedule, base);
    const hoursUntilStart = (next.getTime() - base.getTime()) / 3600000;
    return hoursUntilStart >= 24;
  });
  return pool
    .map((it) => ({ item: it, score: trendingScore(it, base) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.item);
}

/* ------------------------------------------------------------------ */
/* Search suggestions (build spec section 5)                          */
/* Restricted to the real, verifiable landmarks and public spectacle   */
/* added in Batch 1 - not the fictional VibePass-original festivals/   */
/* venues/talent - so every suggestion is something a tester can       */
/* independently recognize as real, per the explicit ask that these    */
/* carry a "legitimacy vibe." Derived from PREVIEW_ITEMS's own titles   */
/* (split on the "Landmark: Descriptor" colon every one of these five  */
/* entries follows) rather than a separately hand-typed list, so       */
/* there's one source of truth and nothing can drift out of sync if a  */
/* title is edited later. Each suggestion is a prefix of its event's   */
/* title, so PreviewGrid's existing substring search matches it        */
/* correctly with zero changes to that search logic.                  */
/* ------------------------------------------------------------------ */
const REAL_WORLD_EVENT_IDS = ["p-louvre-ad", "p-zayed-mosque", "p-ferrari-world", "p-dubai-fountain", "p-qasr-lights"];
const SEARCH_SUGGESTIONS = PREVIEW_ITEMS.filter((it) => REAL_WORLD_EVENT_IDS.indexOf(it.id) !== -1).map((it) =>
  it.title.split(":")[0].trim()
);

/* Simple shuffle-and-slice - not a rigorously unbiased Fisher-Yates,
   but this is a cosmetic rotation, not anything that needs to be
   statistically fair. */
function sampleSuggestions(pool, count) {
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                */
/* This preview sandbox appears to block requests to
   images.unsplash.com outright, likely silently enough that even an
   onError handler can't reliably catch it - two separate rounds of
   individually-verified, real photo URLs both failed to render here.
   So the gradient + icon treatment below is the ONLY thing that ever
   actually renders: no network attempt, no chance of a stuck/blank
   state. Flip ATTEMPT_REAL_PHOTOS to true if this ships somewhere
   outside Claude's artifact preview (a real site, CodeSandbox, your
   own dev server) - the verified src URLs are already sitting in
   PREVIEW_ITEMS' gallery arrays, untouched, ready to use. */
const ATTEMPT_REAL_PHOTOS = true;

const GRADIENT_PAIRS = [
  [C.emerald, C.amethyst],
  [C.amethyst, C.gold],
  [C.gold, C.emerald],
  [C.emerald, C.gold],
];

function GalleryVisual({ src, icon: Icon, index, iconSize = 56 }) {
  const [failed, setFailed] = useState(false);

  if (ATTEMPT_REAL_PHOTOS && src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  const [from, to] = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          opacity: 0.12,
        }}
      />
      <Icon size={iconSize} color="rgba(255,255,255,0.92)" strokeWidth={1.25} />
    </div>
  );
}

/* Image fallbacks.

Remote imagery (Unsplash / Pexels) is fetched at runtime, so any of it can
fail: a blocked host, a rate limit, an offline reviewer. GalleryVisual above
already handles that for the landing-page previews; these two cover the hub
surfaces, which previously either faded the broken image to transparent (the
cover cards) or showed the browser's broken-image glyph (the avatars).

Both keep the same shape and size as the image they replace, so a failure
changes the texture of a card, never its layout. */
function CoverImage({ src, alt, accent, className = "h-full w-full object-cover" }) {
  const [failed, setFailed] = useState(false);
  const tint = accent || C.amethyst;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ backgroundImage: `linear-gradient(135deg, ${tint}, ${C.bg})` }}
      aria-label={alt || undefined}
      role={alt ? "img" : undefined}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          opacity: 0.1,
        }}
      />
    </div>
  );
}

/* Initials rather than a generic silhouette: a name is already on screen next
   to every one of these, so the two reinforce each other. */
function AvatarImage({ src, alt, name, className, style }) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }

  const initials = String(name || alt || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div
      className={`${className} flex items-center justify-center font-extrabold`}
      style={{
        ...style,
        background: `linear-gradient(135deg, ${C.amethyst}33, ${C.emerald}33)`,
        color: C.textHi,
        fontSize: 13,
        letterSpacing: 0.5,
      }}
      aria-label={alt || name || undefined}
      role="img"
    >
      {initials || "\u2022"}
    </div>
  );
}

/* Swipeable card gallery.

The detail sheets already let you page through an item's photos; the cards in
the grid showed gallery[0] and nothing else, so the other three images were
only reachable by opening the item first.

Two details make this work inside a card that is itself a button:

- A swipe must not also count as a tap. onClickCapture swallows the click that
  follows a gesture, so paging photos never opens the detail sheet by accident.
- touchend stops propagating, so a hub's swipe-to-change-tabs gesture does not
  also fire when the swipe was meant for the photos.

A tap with no horizontal travel still falls through to the card, so opening an
item works exactly as before. */
function CardGallery({ photos, iconSize = 44, children }) {
  const [index, setIndex] = useState(0);
  const startRef = useRef(null);
  const swipedRef = useRef(false);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    swipedRef.current = false;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      /* 40px rather than the 60px used for tab swipes: a card is a smaller
      target, and the gesture is bounded by the card's own width. */
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      e.stopPropagation();
      swipedRef.current = true;
      setIndex((i) => {
        const next = dx < 0 ? i + 1 : i - 1;
        if (next < 0) return 0;
        if (next > photos.length - 1) return photos.length - 1;
        return next;
      });
    },
    [photos.length]
  );

  const handleClickCapture = useCallback((e) => {
    if (!swipedRef.current) return;
    swipedRef.current = false;
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const photo = photos[index] || photos[0];

  return (
    <div
      className="absolute inset-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClickCapture={handleClickCapture}
    >
      <div key={index} className="h-full w-full" style={{ animation: "vlFadeUp 0.3s ease" }}>
        <GalleryVisual src={photo.src} icon={photo.icon} index={index} iconSize={iconSize} />
      </div>

      {/* Any scrim the card wants sits here: above the photo, below the dots,
      and — critically — inside this element rather than as a sibling. A
      sibling overlay painted on top would receive every touch, and since it
      is not a descendant the gesture handlers below would never see them. */}
      {children}

      {photos.length > 1 ? (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1" style={{ zIndex: 5 }}>
          {photos.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all"
              style={{
                width: i === index ? 16 : 6,
                background: i === index ? C.emerald : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GoldChip() {
  return (
    <span
      className="relative inline-block h-3.5 w-5 shrink-0 overflow-hidden rounded-sm"
      style={{ backgroundImage: `linear-gradient(135deg, ${C.gold}, #F5D896)` }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-x-0 top-1/2 h-px"
        style={{ background: "rgba(10,10,12,0.45)" }}
      />
      <span
        className="absolute inset-y-0 left-1/2 w-px"
        style={{ background: "rgba(10,10,12,0.45)" }}
      />
    </span>
  );
}

function Wordmark({ size = "text-lg" }) {
  return (
    <span
      className={`${size} font-extrabold tracking-tight`}
      style={{ fontFamily: FONT_DISPLAY }}
    >
      <span style={{ color: C.textHi }}>Vibe</span>
      <span
        style={{
          backgroundImage: `linear-gradient(90deg, ${C.emerald}, ${C.amethyst})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Pass
      </span>
    </span>
  );
}

/* Signature element: a slow "live verification" ticker dramatising the
   compliance + verified-entry story in one glanceable device. */
function VerificationTicker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div
      className="overflow-hidden border-y py-2.5"
      style={{ borderColor: `${C.gold}40`, background: "rgba(217,168,92,0.05)" }}
      aria-hidden="true"
    >
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "vlMarquee 34s linear infinite", width: "max-content" }}
      >
        {doubled.map((t, i) => (
          <span
            key={i}
            className="mx-4 inline-flex items-center gap-2 text-xs"
            style={{ fontFamily: FONT_MONO, color: C.textMid, letterSpacing: 0.3 }}
          >
            <BadgeCheck size={11} color={C.gold} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
function SiteHeader({
  portalMode,
  onSwitchPortal,
  onSignIn,
  onMockLogin,
  menuOpen,
  setMenuOpen,
  onNavClick,
  searchInputRef,
  kindFilter,
}) {
  const [portalMenuOpen, setPortalMenuOpen] = useState(false);
  const portalMenuRef = useRef(null);
  const otherPortals = PORTAL_OPTIONS.filter((p) => p.id !== portalMode);

  useEffect(() => {
    const handleOutsideInteraction = (event) => {
      if (portalMenuRef.current && !portalMenuRef.current.contains(event.target)) setPortalMenuOpen(false);
    };
    const handleKeyboardEsc = (event) => {
      if (event.key === "Escape") setPortalMenuOpen(false);
    };
    if (portalMenuOpen) {
      document.addEventListener("mousedown", handleOutsideInteraction);
      document.addEventListener("touchstart", handleOutsideInteraction);
      document.addEventListener("keydown", handleKeyboardEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
      document.removeEventListener("keydown", handleKeyboardEsc);
    };
  }, [portalMenuOpen]);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{ background: "rgba(10,10,12,0.86)", borderColor: C.line }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2"
            aria-label="Vibe Pass home"
          >
            <Wordmark />
          </button>
          <nav className="hidden items-center gap-5 md:flex">
            {NAV_LINKS.map((l) => {
              const active = KIND_MAP[l.id] && KIND_MAP[l.id] === kindFilter;
              return (
                <button
                  key={l.id}
                  onClick={() => onNavClick(l.id)}
                  className="text-sm font-medium transition-colors"
                  style={{ color: active ? C.textHi : C.textMid }}
                >
                  {l.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (searchInputRef.current) {
                searchInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                searchInputRef.current.focus();
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border transition-transform active:scale-90 md:hidden"
            style={{ borderColor: C.line, color: C.textHi }}
            aria-label="Search"
          >
            <Search size={16} />
          </button>
          <button
            onClick={() => onMockLogin()}
            className="hidden items-center gap-1.5 rounded-full border border-dashed px-3.5 py-2 text-xs font-bold transition-transform active:scale-95 sm:inline-flex"
            style={{ borderColor: `${C.amethyst}88`, color: C.amethyst, background: "rgba(168,85,247,0.08)" }}
            title="One-Click Mock Login (Tester Mode)"
          >
            <Zap size={13} />
            Tester Login
          </button>
          <div className="relative hidden sm:block" ref={portalMenuRef}>
            <button
              onClick={() => setPortalMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors"
              style={{ border: `1px solid ${C.line}`, color: C.textMid }}
              aria-expanded={portalMenuOpen}
              aria-haspopup="menu"
            >
              Switch Portal
              <ChevronDown
                size={13}
                style={{ transform: portalMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              />
            </button>
            {portalMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border py-1.5"
                style={{ background: C.surface, borderColor: C.line, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}
              >
                {otherPortals.map((p) => {
                  const PortalIcon = p.icon;
                  return (
                    <button
                      key={p.id}
                      role="menuitem"
                      onClick={() => {
                        onSwitchPortal(p.id);
                        setPortalMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-white/5"
                      style={{ color: C.textHi }}
                    >
                      <PortalIcon size={14} color={C.textMid} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => onSignIn({ trigger: "signin", role: "fan" })}
            className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-transform active:scale-95 sm:inline-flex"
            style={{ background: C.emerald, color: "#052E16" }}
          >
            <Wallet size={13} />
            Connect Wallet / Sign In
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border md:hidden"
            style={{ borderColor: C.line, color: C.textHi }}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div
          className="border-t px-4 py-4 md:hidden"
          style={{ borderColor: C.line, background: C.bg }}
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  onNavClick(l.id);
                  setMenuOpen(false);
                }}
                className="rounded-xl px-3 py-2.5 text-left text-sm font-medium"
                style={{ color: C.textHi }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={() => {
                onMockLogin();
                setMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 rounded-full border border-dashed px-4 py-2.5 text-sm font-bold"
              style={{ borderColor: `${C.amethyst}88`, color: C.amethyst, background: "rgba(168,85,247,0.08)" }}
            >
              <Zap size={14} />
              One-Click Mock Login (Tester Mode)
            </button>
            {otherPortals.map((p) => {
              const PortalIcon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSwitchPortal(p.id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
                  style={{ border: `1px solid ${C.line}`, color: C.textMid }}
                >
                  <PortalIcon size={14} />
                  {p.label}
                </button>
              );
            })}
            <button
              onClick={() => {
                onSignIn({ trigger: "signin", role: "fan" });
                setMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold"
              style={{ background: C.emerald, color: "#052E16" }}
            >
              <Wallet size={14} />
              Connect Wallet / Sign In
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
function HeroSection({
  portalMode,
  query,
  setQuery,
  activePill,
  onSelectPill,
  searchInputRef,
  onOpenAuth,
  tutorialStep,
  onAdvanceTutorial,
  onSkipTutorial,
}) {
  const heroVariant = portalMode === "talent" ? "talent" : portalMode === "promoter" ? "promoter" : "discover";
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestionSet, setSuggestionSet] = useState(() => sampleSuggestions(SEARCH_SUGGESTIONS, 4));

  /* Rotates to a new random set of suggestion chips every 3 seconds,
     but only while the search bar is focused and still empty - once
     the person starts typing, PreviewGrid's own live filtering takes
     over and a rotating set of unrelated chips would just compete for
     attention with real results. */
  useEffect(() => {
    if (!searchFocused || query) return undefined;
    const interval = window.setInterval(() => {
      setSuggestionSet(sampleSuggestions(SEARCH_SUGGESTIONS, 4));
    }, 3000);
    return () => window.clearInterval(interval);
  }, [searchFocused, query]);
  return (
    <section
      id="top"
      className={`relative px-4 pb-8 pt-10 sm:px-6 lg:px-8 lg:pb-12 lg:pt-16 ${
        tutorialStep === 1 ? "" : "overflow-hidden"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(600px 340px at 85% -10%, rgba(168,85,247,0.16), transparent), radial-gradient(600px 360px at 0% 20%, rgba(34,197,94,0.12), transparent)",
        }}
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <span
          className="mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ border: `1px solid ${C.line}`, color: C.textMid, background: C.surface }}
        >
          <Landmark size={12} color={C.emerald} />
          Hub71 &amp; ADGM Ecosystem Partner
        </span>
        <h1
          className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
          style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}
        >
          {heroVariant === "talent" ? (
            <>
              Get Booked. Get Paid.{" "}
              <span
                style={{
                  backgroundImage: `linear-gradient(90deg, ${C.emerald}, ${C.amethyst})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Grow Your Following.
              </span>
            </>
          ) : heroVariant === "promoter" ? (
            <>
              List Events. Staff Every Shift.{" "}
              <span
                style={{
                  backgroundImage: `linear-gradient(90deg, ${C.emerald}, ${C.amethyst})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Grow Your Promoter Network.
              </span>
            </>
          ) : (
            <>
              Discover Abu Dhabi&apos;s Premier{" "}
              <span
                style={{
                  backgroundImage: `linear-gradient(90deg, ${C.emerald}, ${C.amethyst})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Events, Venues &amp; Culture
              </span>
            </>
          )}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base" style={{ color: C.textMid }}>
          {heroVariant === "talent"
            ? "Verify your Talent Pass, manage your guestlist and get paid on time - built on the same escrow-secured, DCT-compliant rails as the Vibe Pass consumer app."
            : heroVariant === "promoter"
            ? "Register your DCT-verified venue, post events in under a minute, and staff open shifts with MoHRE-checked talent - all on the same escrow-secured rails as the rest of Vibe Pass."
            : "A single verified pass for every ticket, table and experience across the capital - AED payments, instant verify-at-door entry, zero paper."}
        </p>
        {heroVariant === "discover" ? (
          <>
            <div
              className="relative mx-auto mt-6 max-w-xl"
              style={
                tutorialStep === 1
                  ? { zIndex: 1801, boxShadow: "0 0 0 4px rgba(34,197,94,0.45), 0 0 40px rgba(34,197,94,0.35)", borderRadius: 9999 }
                  : undefined
              }
            >
              <div
                className="flex items-center gap-2 rounded-full border p-1.5"
                style={{ borderColor: C.line, background: C.surface }}
              >
                <Search size={16} color={C.textLo} className="ml-2 shrink-0" />
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    setSearchFocused(true);
                    if (tutorialStep === 1 && onAdvanceTutorial) onAdvanceTutorial();
                  }}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search events, venues, or talent..."
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: C.textHi }}
                />
                {query ? (
                  <button
                    onClick={() => setQuery("")}
                    className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ background: C.surfaceHi }}
                    aria-label="Clear search"
                  >
                    <X size={12} color={C.textMid} />
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    if (searchInputRef.current) searchInputRef.current.blur();
                    scrollToId("preview-grid");
                  }}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-transform active:scale-95"
                  style={{ background: C.emerald, color: "#052E16" }}
                >
                  Search
                </button>
              </div>
              {searchFocused && !query && (
                <div
                  className="absolute left-0 right-0 top-full z-20 mt-2 flex flex-wrap items-center justify-center gap-2 rounded-2xl border p-3"
                  style={{ background: C.surface, borderColor: C.line, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}
                >
                  <span
                    className="w-full text-center text-xs font-bold uppercase"
                    style={{ color: C.textLo, letterSpacing: 1 }}
                  >
                    Try searching
                  </span>
                  {suggestionSet.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery(s);
                        setSearchFocused(false);
                        if (searchInputRef.current) searchInputRef.current.blur();
                        scrollToId("preview-grid");
                      }}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                      style={{ background: C.surfaceHi, border: `1px solid ${C.line}`, color: C.textHi }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {tutorialStep === 1 && (
                <TutorialCallout
                  step={1}
                  accent={C.emerald}
                  accentInk="#052E16"
                  title="Tap the search bar"
                  body="Search real events, venues and more - or just browse what's trending below."
                  onSkip={onSkipTutorial}
                  onNext={onAdvanceTutorial}
                  className="absolute left-1/2 top-full mt-3 w-64 -translate-x-1/2"
                />
              )}
            </div>
            <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
              {PILLS.map((p) => {
                const active = activePill === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPill(p.id)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                    style={
                      active
                        ? { background: C.emerald, color: "#052E16", border: `1px solid ${C.emerald}` }
                        : { background: C.surface, color: C.textMid, border: `1px solid ${C.line}` }
                    }
                    aria-pressed={active}
                  >
                    <span>{p.emoji}</span>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </>
        ) : heroVariant === "talent" ? (
          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={() => onOpenAuth({ trigger: "apply", role: "talent" })}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full px-8 text-sm font-bold transition-transform active:scale-95 sm:w-auto"
              style={{ background: C.emerald, color: "#052E16" }}
            >
              <Sparkles size={15} />
              Apply as Talent
            </button>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={() => onOpenAuth({ trigger: "apply", role: "promoter" })}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full px-8 text-sm font-bold transition-transform active:scale-95 sm:w-auto"
              style={{ background: C.emerald, color: "#052E16" }}
            >
              <Building2 size={15} />
              Register Your Venue
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Live preview grid + cards                                          */
/* ------------------------------------------------------------------ */
function EventPreviewCard({ item, onGetPass, onOpenDetail }) {
  return (
    <div
      onClick={() => onOpenDetail(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpenDetail(item);
      }}
      className="flex cursor-pointer flex-col overflow-hidden rounded-3xl border text-left transition-transform active:scale-95"
      style={{ borderColor: C.line, background: C.surface, animation: "vlFadeUp 0.4s ease" }}
    >
      <div
        className="relative h-40 w-full overflow-hidden"
        style={{ backgroundImage: `linear-gradient(135deg, ${C.surfaceHi}, ${C.bg})` }}
      >
        <CardGallery photos={item.gallery} iconSize={44}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "linear-gradient(to top, rgba(10,10,12,0.92), rgba(10,10,12,0.05) 55%)" }}
          />
        </CardGallery>
        <span
          className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-bold uppercase"
          style={{ background: "rgba(10,10,12,0.85)", border: `1px solid ${item.accent}`, color: item.accent, letterSpacing: 1 }}
        >
          {item.tag}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p
          className="text-sm font-bold leading-snug"
          style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}
        >
          {item.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: C.textMid }}>
          <span className="flex items-center gap-1">
            <Calendar size={11} color={item.accent} />
            {item.date} &middot; {item.time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} color={item.accent} />
            {item.zone}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: C.textLo }}>
          <ShieldCheck size={11} color={C.emerald} />
          Permit verified
        </div>
        <div className="mt-3 flex flex-1 items-end justify-between gap-2">
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
              <GoldChip />
              Vibe Ticket
            </p>
            <p className="text-sm font-bold" style={{ color: C.emerald, fontFamily: FONT_MONO }}>
              From AED {item.price}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGetPass(item);
            }}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-transform active:scale-95"
            style={{ background: C.emerald, color: "#052E16" }}
          >
            <Ticket size={12} />
            Get Pass
          </button>
        </div>
      </div>
    </div>
  );
}

function TalentPreviewCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const initials = item.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="flex flex-col overflow-hidden rounded-3xl border p-4"
      style={{ borderColor: C.line, background: C.surface, animation: "vlFadeUp 0.4s ease" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold"
          style={{
            backgroundImage: `linear-gradient(135deg, ${C.emerald}, ${C.amethyst})`,
            color: "#0A0A0C",
            fontFamily: FONT_DISPLAY,
          }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p
            className="truncate text-sm font-bold"
            style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}
          >
            {item.name}
          </p>
          <p className="truncate text-xs" style={{ color: C.textMid }}>
            {item.specialty}
          </p>
          <span className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: C.gold }}>
            <Star size={11} color={C.gold} fill={C.gold} />
            {item.rating}
          </span>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: C.textMid }}>
        <Sparkles size={12} color={item.accent} />
        {item.spotlight}
      </p>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-full border py-2 text-xs font-semibold transition-transform active:scale-95"
        style={{ borderColor: C.line, color: C.textHi }}
        aria-expanded={expanded}
      >
        View Schedule
        <ChevronDown
          size={13}
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}
        />
      </button>
      {expanded && (
        <div
          className="mt-2 flex flex-col gap-1.5 rounded-2xl p-3"
          style={{ background: C.surfaceHi, animation: "vlFadeUp 0.25s ease" }}
        >
          {item.nextDates.map((d) => (
            <p key={d} className="flex items-center gap-1.5 text-xs" style={{ color: C.textMid }}>
              <Clock size={11} color={item.accent} />
              {d}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function SpotPreviewCard({ item, onSave, onClaim, onOpenDetail }) {
  const [saved, setSaved] = useState(false);
  return (
    <div
      onClick={() => onOpenDetail(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpenDetail(item);
      }}
      className="flex cursor-pointer flex-col overflow-hidden rounded-3xl border text-left transition-transform active:scale-95"
      style={{ borderColor: C.line, background: C.surface, animation: "vlFadeUp 0.4s ease" }}
    >
      <div
        className="relative h-40 w-full overflow-hidden"
        style={{ backgroundImage: `linear-gradient(135deg, ${C.surfaceHi}, ${C.bg})` }}
      >
        <CardGallery photos={item.gallery} iconSize={44}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "linear-gradient(to top, rgba(10,10,12,0.92), rgba(10,10,12,0.05) 55%)" }}
          />
        </CardGallery>
        <span
          className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-bold uppercase"
          style={{ background: "rgba(10,10,12,0.85)", border: `1px solid ${item.accent}`, color: item.accent, letterSpacing: 1 }}
        >
          {item.category}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!saved) onSave(item);
            setSaved(true);
          }}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90"
          style={{ background: "rgba(10,10,12,0.75)", border: `1px solid ${C.line}` }}
          aria-label="Save venue"
          aria-pressed={saved}
        >
          <Heart size={14} color={saved ? C.amethyst : C.textHi} fill={saved ? C.amethyst : "none"} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p
          className="text-sm font-bold leading-snug"
          style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}
        >
          {item.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: C.textMid }}>
          <span className="flex items-center gap-1">
            <Star size={11} color={C.gold} fill={C.gold} />
            {item.rating} ({item.reviews})
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} color={item.accent} />
            {item.zone}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClaim(item);
          }}
          className="mt-3 flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-semibold transition-transform active:scale-95"
          style={{ background: "rgba(217,168,92,0.12)", border: `1px solid ${C.gold}55`, color: C.gold }}
        >
          <span className="flex items-center gap-1.5">
            <Gem size={12} />
            {item.perk}
          </span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trending Events module (build spec section 3)                      */
/* Swipeable between "Today" and "Upcoming", both ranked by            */
/* getTrendingEvents (Batch 2). EventPreviewCard is reused completely  */
/* unmodified - same card, same styling, same onGetPass/onOpenDetail   */
/* handlers already wired for the main grid below it.                 */
/* ------------------------------------------------------------------ */
const TRENDING_VIEW_ORDER = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
];

/* Tutorial callout.

Steps 1 and 2 previously duplicated this markup, and both suffered the same
problem in testing: "Skip" was bare text with no border, so it did not read as
a control at all, and nothing in the box indicated which element it referred
to.

Three things fix that, in order of how much they help:

- A caret pointing at the element the step is about, so the box is visibly
  attached to the search bar or the module rather than floating.
- An arrow on the primary action. "Next >" is unambiguous in a way that a bare
  word is not, and the filled accent plus glow makes it the obvious target.
- "Skip" gets a real border, so both options read as buttons while the accent
  fill still marks which one moves forward.

Progress is shown as dots as well as text, which reads faster than "Step 2
of 3" alone. */
function TutorialCallout({
  step,
  total = 3,
  accent,
  accentInk,
  title,
  body,
  onSkip,
  onNext,
  nextLabel = "Next",
  className = "",
  style = {},
}) {
  return (
    <div
      className={`relative rounded-2xl border p-4 text-center ${className}`}
      style={{
        background: C.surface,
        borderColor: `${accent}66`,
        zIndex: 1801,
        boxShadow: `0 12px 32px rgba(0,0,0,0.6), 0 0 22px ${accent}26`,
        ...style,
      }}
    >
      {/* Caret: a rotated square sharing the box's fill and border, so it reads
      as part of the same surface rather than a separate shape. */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45"
        style={{
          top: -7,
          background: C.surface,
          borderLeft: `1px solid ${accent}66`,
          borderTop: `1px solid ${accent}66`,
          borderTopLeftRadius: 3,
        }}
      />

      <div className="flex items-center justify-center gap-2">
        <span className="flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step - 1 ? 14 : 5,
                background: i === step - 1 ? accent : "rgba(255,255,255,0.22)",
              }}
            />
          ))}
        </span>
        <span className="text-xs font-bold uppercase" style={{ color: accent, letterSpacing: 1 }}>
          Step {step} of {total}
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold" style={{ color: C.textHi }}>
        {title}
      </p>
      <p className="mt-1 text-xs" style={{ color: C.textMid }}>
        {body}
      </p>

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95 ${focusRing}`}
          style={{ border: `1px solid ${C.line}`, color: C.textMid, background: "transparent" }}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onNext}
          className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold transition-transform active:scale-95 ${focusRing}`}
          style={{
            background: accent,
            color: accentInk,
            boxShadow: `0 0 16px ${accent}66`,
          }}
        >
          {nextLabel}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function TrendingModule({ items, onGetPass, onOpenDetail, tutorialStep, onAdvanceTutorial, onSkipTutorial }) {
  const [trendingView, setTrendingView] = useState("today");
  const touchStartRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  /* Identical swipe mechanics to the in-app HubSwitcher (VibePassApp) -
     same threshold, same mostly-horizontal check - adapted from its
     3-item hub order down to this module's 2-item Today/Upcoming
     order, reusing the gesture logic rather than rebuilding it. */
  const handleTouchEnd = useCallback(
    (e) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const SWIPE_THRESHOLD = 60;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const order = TRENDING_VIEW_ORDER.map((v) => v.id);
      const currentIndex = order.indexOf(trendingView);
      const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= 0 && nextIndex < order.length) {
        setTrendingView(order[nextIndex]);
        if (tutorialStep === 2 && onAdvanceTutorial) onAdvanceTutorial();
      }
    },
    [trendingView, tutorialStep, onAdvanceTutorial]
  );

  const trendingEvents = useMemo(
    () => getTrendingEvents(items, trendingView, new Date(), MOCK_USER_LOCATION),
    [items, trendingView]
  );
  const activeIndex = TRENDING_VIEW_ORDER.findIndex((v) => v.id === trendingView);

  return (
    <section
      id="trending-module"
      className="relative px-4 pt-6 sm:px-6 lg:px-8"
      style={
        tutorialStep === 2
          ? { zIndex: 1801, boxShadow: "0 0 0 4px rgba(168,85,247,0.45), 0 0 40px rgba(168,85,247,0.35)", borderRadius: 24 }
          : undefined
      }
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className="text-xl font-bold sm:text-2xl"
              style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}
            >
              Trending Events Today &mdash; Need Tickets?
            </h2>
            <p className="mt-1 text-sm" style={{ color: C.textMid }}>
              Ranked by how fast they&apos;re filling up and how soon they start.
            </p>
          </div>
          <div
            className="relative flex w-44 shrink-0 items-center rounded-full p-1"
            style={{ background: C.surface, border: `1px solid ${C.line}` }}
          >
            <div
              className="absolute inset-y-1 rounded-full transition-all duration-300 ease-out"
              style={{
                backgroundImage: `linear-gradient(90deg, ${C.emerald}, ${C.amethyst})`,
                width: "calc(50% - 4px)",
                left: activeIndex === 0 ? "4px" : "50%",
              }}
            />
            {TRENDING_VIEW_ORDER.map((v) => {
              const active = v.id === trendingView;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setTrendingView(v.id);
                    if (tutorialStep === 2 && onAdvanceTutorial) onAdvanceTutorial();
                  }}
                  className={`relative z-10 flex flex-1 items-center justify-center rounded-full py-2 text-xs font-bold transition-colors duration-200 ${focusRing}`}
                  style={{ color: active ? "#0A0A0C" : C.textMid }}
                  aria-pressed={active}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {tutorialStep === 2 && (
          <TutorialCallout
            step={2}
            accent={C.amethyst}
            accentInk="#1A0B2E"
            title="Swipe Today / Upcoming"
            body="Swipe left or right on this module - or tap the pill above - to see what's trending right now versus what's coming up."
            onSkip={onSkipTutorial}
            onNext={onAdvanceTutorial}
            className="mx-auto mt-3 w-64 sm:ml-auto sm:mr-0"
          />
        )}

        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="mt-6">
          {trendingEvents.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 rounded-3xl border px-6 py-12 text-center"
              style={{ borderColor: C.line, background: C.surface }}
            >
              <Flame size={22} color={C.textLo} />
              <p className="text-sm font-semibold" style={{ color: C.textHi }}>
                Nothing trending {trendingView === "today" ? "today" : "upcoming"} right now
              </p>
              <p className="text-xs" style={{ color: C.textMid }}>
                Check back soon, or browse everything below.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trendingEvents.map((it) => (
                <EventPreviewCard key={it.id} item={it} onGetPass={onGetPass} onOpenDetail={onOpenDetail} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PreviewGrid({ items, activePill, kindFilter, query, onGetPass, onSave, onClaim, onClearFilters, onOpenDetail }) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (kindFilter !== "all" && it.kind !== kindFilter) return false;
      if (activePill && it.pill !== activePill) return false;
      if (!q) return true;
      const hay = [it.title, it.name, it.zone, it.tag, it.category, it.specialty]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, activePill, kindFilter, query]);

  const hasFilter = Boolean(activePill) || kindFilter !== "all";

  return (
    <section id="preview-grid" className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between">
          <div>
            <h2
              className="text-xl font-bold sm:text-2xl"
              style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}
            >
              Live on Vibe Pass
            </h2>
            <p className="mt-1 text-sm" style={{ color: C.textMid }}>
              Real events, venues and talent - no account required to browse.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasFilter && (
              <button onClick={onClearFilters} className="text-xs font-semibold" style={{ color: C.amethyst }}>
                Clear filters
              </button>
            )}
            <span className="hidden text-xs sm:inline" style={{ color: C.textLo }}>
              {filtered.length} {filtered.length === 1 ? "result" : "results"}
            </span>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div
            className="mt-6 flex flex-col items-center gap-2 rounded-3xl border px-6 py-12 text-center"
            style={{ borderColor: C.line, background: C.surface }}
          >
            <Search size={22} color={C.textLo} />
            <p className="text-sm font-semibold" style={{ color: C.textHi }}>
              Nothing matches yet
            </p>
            <p className="text-xs" style={{ color: C.textMid }}>
              Try another keyword or category pill.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((it) => {
              if (it.kind === "event") return <EventPreviewCard key={it.id} item={it} onGetPass={onGetPass} onOpenDetail={onOpenDetail} />;
              if (it.kind === "talent") return <TalentPreviewCard key={it.id} item={it} />;
              return <SpotPreviewCard key={it.id} item={it} onSave={onSave} onClaim={onClaim} onOpenDetail={onOpenDetail} />;
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Feature highlights                                                  */
/* ------------------------------------------------------------------ */
function AdvantagePubmat() {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border" style={{ borderColor: C.line }}>
      <div
        className="relative px-6 py-10 text-center sm:px-10 sm:py-12"
        style={{ backgroundImage: `linear-gradient(150deg, ${C.emerald}, ${C.amethyst})` }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            opacity: 0.12,
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase"
            style={{ background: "rgba(10,10,12,0.35)", color: "#FFFFFF", letterSpacing: 1.5 }}
          >
            <Sparkles size={11} />
            Now Live in Abu Dhabi
          </span>
          <p className="mt-4 text-3xl font-extrabold sm:text-4xl" style={{ fontFamily: FONT_DISPLAY }}>
            <span style={{ color: "#FFFFFF" }}>Vibe</span>
            <span style={{ color: "rgba(10,10,12,0.55)" }}>Pass</span>
            <sup className="ml-0.5 text-xs font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>
              &trade;
            </sup>
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold" style={{ color: "rgba(10,10,12,0.8)" }}>
            The Vibe Pass Advantage
          </p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left"
                  style={{ background: "rgba(10,10,12,0.28)" }}
                >
                  <Icon size={17} color="#FFFFFF" />
                  <span className="text-xs font-bold" style={{ color: "#FFFFFF" }}>
                    {f.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(10,10,12,0.28)", color: "#FFFFFF" }}
            >
              <ShieldCheck size={11} />
              DCT Abu Dhabi Compliant
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(10,10,12,0.28)", color: "#FFFFFF" }}
            >
              <Fingerprint size={11} />
              UAE Pass Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureHighlights() {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8" style={{ background: C.surface }}>
      <div className="mx-auto max-w-7xl">
        <AdvantagePubmat />
        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-3xl border p-5" style={{ borderColor: C.line, background: C.bg }}>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${C.emerald}22, ${C.amethyst}22)`,
                    border: `1px solid ${C.line}`,
                  }}
                >
                  <Icon size={19} color={C.emerald} />
                </div>
                <p
                  className="mt-3.5 text-sm font-bold"
                  style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}
                >
                  {f.title}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.textMid }}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Auth / wallet modal                                                */
/* ------------------------------------------------------------------ */
function modalTitle(authState) {
  if (!authState) return "Sign in to Vibe Pass";
  const { trigger, item, role } = authState;
  if (trigger === "getpass" && item) return `Get your pass for ${item.title}`;
  if (trigger === "claim" && item) return `Claim your perk at ${item.title}`;
  if (trigger === "save" && item) return `Save ${item.title} to your Vibe Pass`;
  if (trigger === "apply" && role === "talent") return "Apply for your Talent Pass";
  return "Sign in to Vibe Pass";
}

/* Pre-verified document row for the Talent KYC form. Ships already in
   the "Uploaded & Verified" state for demo speed, but stays genuinely
   functional - tapping it opens a real file picker and swaps the
   filename if the presenter wants to show a live re-upload. */
function DocumentUploadZone({ label, defaultFilename }) {
  const [filename, setFilename] = useState(defaultFilename);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) setFilename(file.name);
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current && inputRef.current.click()}
      className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-transform active:scale-95"
      style={{ borderColor: `${C.emerald}55`, background: "rgba(34,197,94,0.08)" }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "rgba(34,197,94,0.15)", border: `1px solid ${C.emerald}` }}
      >
        <FileText size={16} color={C.emerald} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold" style={{ color: C.textHi }}>
          {label}
        </span>
        <span
          className="mt-0.5 block truncate text-xs"
          style={{ color: C.textMid, fontFamily: FONT_MONO }}
        >
          {filename}
        </span>
      </span>
      <span
        className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
        style={{ background: "rgba(34,197,94,0.18)", color: C.emerald }}
      >
        <CheckCircle2 size={12} />
        Verified
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Event detail overlay - infinite photo carousel + Acquire Pass       */
/* ------------------------------------------------------------------ */
/* Opened from a compact EventPreviewCard. Owns its own gallery index
   so left/right navigation and the dot indicators loop infinitely
   through the event's themed photos ((index + 1) % photos.length),
   independent of the compact card's own single thumbnail above. */
function EventDetailModal({ event, onClose, onGetPass }) {
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    setGalleryIndex(0);
  }, [event]);

  if (!event) return null;

  const photos = event.gallery;
  const nextPhoto = () => setGalleryIndex((i) => (i + 1) % photos.length);
  const prevPhoto = () => setGalleryIndex((i) => (i - 1 + photos.length) % photos.length);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}
        aria-label="Close"
      />
      <div
        className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl border-t sm:max-w-lg sm:rounded-3xl sm:border"
        style={{
          background: C.surface,
          borderColor: C.line,
          maxHeight: "92vh",
          animation: "vlSlideUp 0.3s cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        <div className="vl-noscroll overflow-y-auto">
          <div className="relative h-64 w-full overflow-hidden sm:h-72" style={{ background: C.bg }}>
            <div key={galleryIndex} className="h-full w-full" style={{ animation: "vlFadeUp 0.3s ease" }}>
              <GalleryVisual src={photos[galleryIndex].src} icon={photos[galleryIndex].icon} index={galleryIndex} iconSize={72} />
            </div>
            <div
              className="absolute inset-0"
              style={{ backgroundImage: "linear-gradient(to top, rgba(10,10,12,0.85), rgba(10,10,12,0.05) 55%)" }}
            />
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ background: "rgba(10,10,12,0.65)" }}
              aria-label="Close"
            >
              <X size={16} color="#FFFFFF" />
            </button>
            <span
              className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold uppercase"
              style={{ background: "rgba(10,10,12,0.75)", border: `1px solid ${event.accent}`, color: event.accent, letterSpacing: 1 }}
            >
              {event.tag}
            </span>

            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ background: "rgba(10,10,12,0.55)" }}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={18} color="#FFFFFF" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ background: "rgba(10,10,12,0.55)" }}
                  aria-label="Next photo"
                >
                  <ChevronRight size={18} color="#FFFFFF" />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIndex(i)}
                      className="rounded-full transition-all duration-200"
                      style={{
                        width: i === galleryIndex ? 16 : 6,
                        height: 6,
                        background: i === galleryIndex ? C.emerald : "rgba(255,255,255,0.5)",
                      }}
                      aria-label={`Go to photo ${i + 1}`}
                      aria-current={i === galleryIndex}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="px-5 py-5">
            <p className="text-lg font-bold leading-snug" style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}>
              {event.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm" style={{ color: C.textMid }}>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} color={event.accent} />
                {event.date} &middot; {event.time}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={13} color={event.accent} />
                {event.zone}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: C.textLo }}>
              <ShieldCheck size={12} color={C.emerald} />
              DCT Abu Dhabi permit verified
            </div>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: C.textMid }}>
              {event.blurb}
            </p>

            <div
              className="mt-5 flex items-center justify-between gap-3 rounded-2xl border p-4"
              style={{ borderColor: C.line, background: C.surfaceHi }}
            >
              <div>
                <p className="flex items-center gap-1.5 text-xs uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
                  <GoldChip />
                  Vibe Ticket
                </p>
                <p className="text-lg font-bold" style={{ color: C.emerald, fontFamily: FONT_MONO }}>
                  From AED {event.price}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onGetPass(event);
              }}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-transform active:scale-95"
              style={{ background: C.emerald, color: "#052E16" }}
            >
              <Ticket size={15} />
              Acquire Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* Spot (venue) detail overlay - same infinite carousel, venue fields  */
/* ------------------------------------------------------------------ */
function SpotDetailModal({ spot, onClose, onClaim }) {
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    setGalleryIndex(0);
  }, [spot]);

  if (!spot) return null;

  const photos = spot.gallery;
  const nextPhoto = () => setGalleryIndex((i) => (i + 1) % photos.length);
  const prevPhoto = () => setGalleryIndex((i) => (i - 1 + photos.length) % photos.length);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}
        aria-label="Close"
      />
      <div
        className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl border-t sm:max-w-lg sm:rounded-3xl sm:border"
        style={{
          background: C.surface,
          borderColor: C.line,
          maxHeight: "92vh",
          animation: "vlSlideUp 0.3s cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        <div className="vl-noscroll overflow-y-auto">
          <div className="relative h-64 w-full overflow-hidden sm:h-72" style={{ background: C.bg }}>
            <div key={galleryIndex} className="h-full w-full" style={{ animation: "vlFadeUp 0.3s ease" }}>
              <GalleryVisual src={photos[galleryIndex].src} icon={photos[galleryIndex].icon} index={galleryIndex} iconSize={72} />
            </div>
            <div
              className="absolute inset-0"
              style={{ backgroundImage: "linear-gradient(to top, rgba(10,10,12,0.85), rgba(10,10,12,0.05) 55%)" }}
            />
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ background: "rgba(10,10,12,0.65)" }}
              aria-label="Close"
            >
              <X size={16} color="#FFFFFF" />
            </button>
            <span
              className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold uppercase"
              style={{ background: "rgba(10,10,12,0.75)", border: `1px solid ${spot.accent}`, color: spot.accent, letterSpacing: 1 }}
            >
              {spot.category}
            </span>

            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ background: "rgba(10,10,12,0.55)" }}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={18} color="#FFFFFF" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ background: "rgba(10,10,12,0.55)" }}
                  aria-label="Next photo"
                >
                  <ChevronRight size={18} color="#FFFFFF" />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIndex(i)}
                      className="rounded-full transition-all duration-200"
                      style={{
                        width: i === galleryIndex ? 16 : 6,
                        height: 6,
                        background: i === galleryIndex ? C.emerald : "rgba(255,255,255,0.5)",
                      }}
                      aria-label={`Go to photo ${i + 1}`}
                      aria-current={i === galleryIndex}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="px-5 py-5">
            <p className="text-lg font-bold leading-snug" style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}>
              {spot.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm" style={{ color: C.textMid }}>
              <span className="flex items-center gap-1.5">
                <Star size={13} color={C.gold} fill={C.gold} />
                {spot.rating} ({spot.reviews} reviews)
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={13} color={spot.accent} />
                {spot.zone}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: C.textMid }}>
              {spot.blurb}
            </p>

            <button
              onClick={() => {
                onClose();
                onClaim(spot);
              }}
              className="mt-5 flex items-center justify-between gap-2 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition-transform active:scale-95"
              style={{ background: "rgba(217,168,92,0.12)", border: `1px solid ${C.gold}55`, color: C.gold }}
            >
              <span className="flex items-center gap-2">
                <Gem size={14} />
                {spot.perk}
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function AuthModal({ authState, onClose, onTalentVerified, onConsumerEnter, onMockLogin, onPromoterVerified }) {
  const initialRole = authState && authState.role ? authState.role : "fan";
  const [role, setRole] = useState(initialRole);
  const [step, setStep] = useState("choose");
  const [method, setMethod] = useState(null);
  const [consumerName, setConsumerName] = useState(CONSUMER_MOCK_PROFILE.name);
  const [consumerEmail, setConsumerEmail] = useState(CONSUMER_MOCK_PROFILE.email);
  const [consumerPhone, setConsumerPhone] = useState(CONSUMER_MOCK_PROFILE.phone);
  const [talentStageName, setTalentStageName] = useState(TALENT_MOCK_PROFILE.stageName);
  const [talentEmiratesId, setTalentEmiratesId] = useState(TALENT_MOCK_PROFILE.emiratesId);
  const [talentPortfolioUrl, setTalentPortfolioUrl] = useState(TALENT_MOCK_PROFILE.portfolioUrl);
  const [promoterBusinessName, setPromoterBusinessName] = useState(PROMOTER_MOCK_PROFILE.businessName);
  const [promoterContactName, setPromoterContactName] = useState(PROMOTER_MOCK_PROFILE.contactName);
  const [promoterContactEmail, setPromoterContactEmail] = useState(PROMOTER_MOCK_PROFILE.contactEmail);
  const [promoterContactPhone, setPromoterContactPhone] = useState(PROMOTER_MOCK_PROFILE.contactPhone);
  const [promoterPermitNumber, setPromoterPermitNumber] = useState(PROMOTER_MOCK_PROFILE.permitNumber);

  useEffect(() => {
    setRole(authState && authState.role ? authState.role : "fan");
    setStep("choose");
    setMethod(null);
    setConsumerName(CONSUMER_MOCK_PROFILE.name);
    setConsumerEmail(CONSUMER_MOCK_PROFILE.email);
    setConsumerPhone(CONSUMER_MOCK_PROFILE.phone);
    setTalentStageName(TALENT_MOCK_PROFILE.stageName);
    setTalentEmiratesId(TALENT_MOCK_PROFILE.emiratesId);
    setTalentPortfolioUrl(TALENT_MOCK_PROFILE.portfolioUrl);
    setPromoterBusinessName(PROMOTER_MOCK_PROFILE.businessName);
    setPromoterContactName(PROMOTER_MOCK_PROFILE.contactName);
    setPromoterContactEmail(PROMOTER_MOCK_PROFILE.contactEmail);
    setPromoterContactPhone(PROMOTER_MOCK_PROFILE.contactPhone);
    setPromoterPermitNumber(PROMOTER_MOCK_PROFILE.permitNumber);
  }, [authState]);

  if (!authState) return null;

  const chooseMethod = (m) => {
    setMethod(m);
    setStep("connecting");
    setTimeout(() => setStep("success"), 1200);
  };

  const submitTalentVerification = () => {
    if (onTalentVerified) onTalentVerified();
  };

  const submitPromoterRegistration = () => {
    if (onPromoterVerified) onPromoterVerified();
  };

  const methodMeta =
    method === "account"
      ? { title: "Vibe Pass", accent: C.emerald }
      : AUTH_METHODS.find((m) => m.id === method) || null;

  const title =
    role === "talent"
      ? "Verify Your Talent Pass"
      : role === "promoter"
      ? "Register Your Promoter Hub"
      : modalTitle(authState);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }}
        aria-label="Close"
      />
      <div
        className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl border-t sm:max-w-md sm:rounded-3xl sm:border"
        style={{
          background: C.surface,
          borderColor: C.line,
          maxHeight: "90vh",
          animation: "vlSlideUp 0.3s cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: C.line }}>
          <p className="pr-3 text-sm font-bold" style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}>
            {title}
          </p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: C.surfaceHi }}
            aria-label="Close"
          >
            <X size={14} color={C.textHi} />
          </button>
        </div>
        <div className="border-b px-5 py-3" style={{ borderColor: C.line, background: "rgba(168,85,247,0.06)" }}>
          <button
            onClick={() => {
              onClose();
              if (onMockLogin) onMockLogin(role);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-2.5 text-xs font-bold transition-transform active:scale-95"
            style={{ borderColor: `${C.amethyst}88`, color: C.amethyst }}
          >
            <Zap size={14} />
            One-Click Mock Login (Tester Mode)
          </button>
        </div>
        <div className="vl-noscroll overflow-y-auto px-5 py-5">
          {step === "choose" && (
            <>
              <p className="text-xs font-bold uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
                I&apos;m joining as
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ROLES.map((r) => {
                  const RoleIcon = r.icon;
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-transform active:scale-95"
                      style={
                        active
                          ? { borderColor: C.emerald, background: "rgba(34,197,94,0.08)" }
                          : { borderColor: C.line, background: C.surfaceHi }
                      }
                      aria-pressed={active}
                    >
                      <RoleIcon size={16} color={active ? C.emerald : C.textMid} />
                      <span className="text-xs font-semibold" style={{ color: active ? C.textHi : C.textMid }}>
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {role === "fan" ? (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
                    Your details
                  </p>
                  <div className="mt-2 flex flex-col gap-2.5">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Full name
                      </span>
                      <input
                        value={consumerName}
                        onChange={(e) => setConsumerName(e.target.value)}
                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                        style={{ borderColor: C.line, background: C.surfaceHi, color: C.textHi }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Email address
                      </span>
                      <input
                        type="email"
                        value={consumerEmail}
                        onChange={(e) => setConsumerEmail(e.target.value)}
                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                        style={{ borderColor: C.line, background: C.surfaceHi, color: C.textHi }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Phone number
                      </span>
                      <div
                        className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
                        style={{ borderColor: C.line, background: C.surfaceHi }}
                      >
                        <Phone size={14} color={C.textLo} className="shrink-0" />
                        <input
                          type="tel"
                          value={consumerPhone}
                          onChange={(e) => setConsumerPhone(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: C.textHi, fontFamily: FONT_MONO }}
                        />
                      </div>
                    </label>
                  </div>
                  <button
                    onClick={() => chooseMethod("account")}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-transform active:scale-95"
                    style={{ background: C.emerald, color: "#052E16" }}
                  >
                    Continue
                    <ArrowRight size={14} />
                  </button>

                  <p
                    className="mt-4 text-center text-xs font-bold uppercase"
                    style={{ color: C.textLo, letterSpacing: 1 }}
                  >
                    Or continue with
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {AUTH_METHODS.map((m) => {
                      const MethodIcon = m.icon;
                      return (
                        <button
                          key={m.id}
                          onClick={() => chooseMethod(m.id)}
                          className="flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-transform active:scale-95"
                          style={{ borderColor: C.line, background: C.surfaceHi }}
                          aria-label={m.title}
                          title={m.title}
                        >
                          <MethodIcon size={15} color={m.accent} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : role === "talent" ? (
                <div className="mt-5">
                  <div
                    className="mb-4 flex items-center gap-2.5 rounded-2xl border p-3"
                    style={{ borderColor: `${C.emerald}55`, background: "rgba(34,197,94,0.08)" }}
                  >
                    <Fingerprint size={18} color={C.emerald} />
                    <p className="text-xs font-semibold" style={{ color: C.textHi }}>
                      Identity confirmed via UAE Pass
                    </p>
                  </div>

                  <p className="text-xs font-bold uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
                    Your details
                  </p>
                  <div className="mt-2 flex flex-col gap-2.5">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Stage name
                      </span>
                      <div
                        className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
                        style={{ borderColor: C.line, background: C.surfaceHi }}
                      >
                        <Mic2 size={14} color={C.textLo} className="shrink-0" />
                        <input
                          value={talentStageName}
                          onChange={(e) => setTalentStageName(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: C.textHi }}
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Emirates ID number
                      </span>
                      <div
                        className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
                        style={{ borderColor: C.line, background: C.surfaceHi }}
                      >
                        <CreditCard size={14} color={C.textLo} className="shrink-0" />
                        <input
                          value={talentEmiratesId}
                          onChange={(e) => setTalentEmiratesId(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: C.textHi, fontFamily: FONT_MONO }}
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Portfolio URL
                      </span>
                      <div
                        className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
                        style={{ borderColor: C.line, background: C.surfaceHi }}
                      >
                        <Link2 size={14} color={C.textLo} className="shrink-0" />
                        <input
                          value={talentPortfolioUrl}
                          onChange={(e) => setTalentPortfolioUrl(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: C.textHi }}
                        />
                      </div>
                    </label>
                  </div>

                  <p
                    className="mt-4 text-xs font-bold uppercase"
                    style={{ color: C.textLo, letterSpacing: 1 }}
                  >
                    Verification documents
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {KYC_DOCUMENTS.map((doc) => (
                      <DocumentUploadZone key={doc.id} label={doc.label} defaultFilename={doc.filename} />
                    ))}
                  </div>

                  <button
                    onClick={submitTalentVerification}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-transform active:scale-95"
                    style={{ background: C.emerald, color: "#052E16" }}
                  >
                    <BadgeCheck size={15} />
                    Submit Verification &amp; Continue
                  </button>
                </div>
              ) : (
                <div className="mt-5">
                  <div
                    className="mb-4 flex items-center gap-2.5 rounded-2xl border p-3"
                    style={{ borderColor: `${C.emerald}55`, background: "rgba(34,197,94,0.08)" }}
                  >
                    <ShieldCheck size={18} color={C.emerald} />
                    <p className="text-xs font-semibold" style={{ color: C.textHi }}>
                      Venue &amp; event permit verified via DCT Abu Dhabi
                    </p>
                  </div>

                  <p className="text-xs font-bold uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
                    Your details
                  </p>
                  <div className="mt-2 flex flex-col gap-2.5">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Business name
                      </span>
                      <div
                        className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
                        style={{ borderColor: C.line, background: C.surfaceHi }}
                      >
                        <Building2 size={14} color={C.textLo} className="shrink-0" />
                        <input
                          value={promoterBusinessName}
                          onChange={(e) => setPromoterBusinessName(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: C.textHi }}
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Contact name
                      </span>
                      <input
                        value={promoterContactName}
                        onChange={(e) => setPromoterContactName(e.target.value)}
                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                        style={{ borderColor: C.line, background: C.surfaceHi, color: C.textHi }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Contact email
                      </span>
                      <input
                        type="email"
                        value={promoterContactEmail}
                        onChange={(e) => setPromoterContactEmail(e.target.value)}
                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                        style={{ borderColor: C.line, background: C.surfaceHi, color: C.textHi }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        Contact phone
                      </span>
                      <div
                        className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
                        style={{ borderColor: C.line, background: C.surfaceHi }}
                      >
                        <Phone size={14} color={C.textLo} className="shrink-0" />
                        <input
                          type="tel"
                          value={promoterContactPhone}
                          onChange={(e) => setPromoterContactPhone(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: C.textHi, fontFamily: FONT_MONO }}
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold" style={{ color: C.textMid }}>
                        DCT permit number
                      </span>
                      <div
                        className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
                        style={{ borderColor: C.line, background: C.surfaceHi }}
                      >
                        <ShieldCheck size={14} color={C.textLo} className="shrink-0" />
                        <input
                          value={promoterPermitNumber}
                          onChange={(e) => setPromoterPermitNumber(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: C.textHi, fontFamily: FONT_MONO }}
                        />
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={submitPromoterRegistration}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-transform active:scale-95"
                    style={{ background: C.emerald, color: "#052E16" }}
                  >
                    <BadgeCheck size={15} />
                    Submit Registration &amp; Continue
                  </button>
                </div>
              )}

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs" style={{ color: C.textLo }}>
                <Lock size={11} />
                256-bit encrypted &middot; DCT Abu Dhabi compliant ticketing
              </p>
            </>
          )}
          {step === "connecting" && methodMeta && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div
                className="h-11 w-11 rounded-full animate-spin"
                style={{ border: "3px solid #2A2F3A", borderTopColor: methodMeta.accent }}
              />
              <div>
                <p className="text-sm font-semibold" style={{ color: C.textHi }}>
                  Connecting with {methodMeta.title}...
                </p>
                <p className="mt-1 text-xs" style={{ color: C.textMid }}>
                  Verifying your identity securely
                </p>
              </div>
            </div>
          )}
          {step === "success" && methodMeta && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "rgba(34,197,94,0.12)" }}
              >
                <BadgeCheck size={26} color={C.emerald} />
              </div>
              <p className="text-base font-bold" style={{ color: C.textHi, fontFamily: FONT_DISPLAY }}>
                You&apos;re verified!
              </p>
              <p className="max-w-xs text-xs" style={{ color: C.textMid }}>
                {authState.item
                  ? `${authState.item.title || authState.item.name} is ready in your Vibe Pass account.`
                  : "Your Vibe Pass account is ready."}
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onConsumerEnter) onConsumerEnter();
                }}
                className="mt-2 flex h-11 w-full items-center justify-center rounded-full text-sm font-bold transition-transform active:scale-95"
                style={{ background: C.emerald, color: "#052E16" }}
              >
                Continue to Vibe Pass
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */
function SiteFooter({ onNavClick, onOpenAuth }) {
  const cols = [
    {
      title: "Discover",
      links: [
        { label: "Events", id: "events" },
        { label: "Venues & Spots", id: "spots" },
        { label: "Talent Directory", id: "talent" },
      ],
    },
    {
      title: "Talent",
      links: [
        { label: "Apply as Talent", action: () => onOpenAuth({ trigger: "apply", role: "talent" }) },
      ],
    },
    {
      title: "Legal",
      links: [{ label: "Privacy Policy" }, { label: "Terms of Service" }],
    },
  ];

  return (
    <footer className="border-t px-4 py-10 sm:px-6 lg:px-8" style={{ borderColor: C.line, background: C.bg }}>
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Wordmark />
            <p className="mt-2 text-xs" style={{ color: C.textLo }}>
              Abu Dhabi&apos;s discovery portal for events, venues and talent.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase" style={{ color: C.textLo, letterSpacing: 1 }}>
                {col.title}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <button
                    key={l.label}
                    onClick={() => (l.action ? l.action() : onNavClick(l.id))}
                    className="text-left text-xs font-medium transition-colors"
                    style={{ color: C.textMid }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-6" style={{ borderColor: C.line }}>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{ border: `1px solid ${C.line}`, color: C.textMid }}
          >
            <Landmark size={11} color={C.emerald} /> ADGM Registered Ecosystem
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{ border: `1px solid ${C.line}`, color: C.textMid }}
          >
            <Building2 size={11} color={C.amethyst} /> Hub71 Partner
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{ border: `1px solid ${C.line}`, color: C.textMid }}
          >
            <ShieldCheck size={11} color={C.gold} /> DCT Abu Dhabi Compliant
          </span>
        </div>
        <p className="mt-6 text-center text-xs" style={{ color: C.textLo }}>
          Epicenter Technologies LTD &middot; Vibe Pass&trade; &middot; Events ticketing regulated under DCT Abu Dhabi.
        </p>
      </div>
    </footer>
  );
}
function VibePassLandingPage({ referredGuest, onConsumerEnter, onTalentVerified, onMockLogin, onPromoterVerified }) {
  const [portalMode, setPortalMode] = useState("discover");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activePill, setActivePill] = useState(null);
  const [kindFilter, setKindFilter] = useState("all");
  const [authState, setAuthState] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const searchInputRef = useRef(null);

  /* First-time coach-mark tutorial (build spec section 6). "First
     time" here means once per page load, tracked in component state -
     this artifact can't use localStorage/sessionStorage, so unlike a
     real deployed site this resets on refresh rather than persisting
     across visits. 1/2/3 = the three steps; null = not shown yet;
     "done" = finished or skipped, never shown again this session.
     Starts null and flips to 1 after a short delay so the page has a
     moment to render before the tutorial appears over it. */
  const [tutorialStep, setTutorialStep] = useState(null);
  useEffect(() => {
    const t = window.setTimeout(() => setTutorialStep(1), 900);
    return () => window.clearTimeout(t);
  }, []);
  const advanceTutorial = useCallback(() => {
    setTutorialStep((s) => (s === 1 ? 2 : s === 2 ? 3 : "done"));
  }, []);
  const skipTutorial = useCallback(() => setTutorialStep("done"), []);

  /* Derives display-ready date/time strings from each event's schedule
     at render time, so they're never stale - a hardcoded "Fri, 24 Jul"
     would only ever be accurate on one real calendar date. Talent and
     spot items pass through unchanged; they carry no schedule. */
  const displayItems = useMemo(
    () =>
      PREVIEW_ITEMS.map((item) => {
        if (item.kind !== "event" || !item.schedule) return item;
        const { date, time } = scheduleDisplay(item.schedule);
        return { ...item, date, time };
      }),
    []
  );

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (document.getElementById("vl-font-link")) return undefined;
    const link = document.createElement("link");
    link.id = "vl-font-link";
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
    return undefined;
  }, []);

  const openAuth = useCallback((state) => setAuthState(state), []);
  const closeAuth = useCallback(() => setAuthState(null), []);

  const selectPill = useCallback((id) => {
    setKindFilter("all");
    setActivePill((p) => (p === id ? null : id));
  }, []);

  const selectKind = useCallback((kind) => {
    setActivePill(null);
    setKindFilter((k) => (k === kind ? "all" : kind));
  }, []);

  const handleNavClick = useCallback(
    (id) => {
      if (KIND_MAP[id]) selectKind(KIND_MAP[id]);
      scrollToId("preview-grid");
    },
    [selectKind]
  );

  const handleGetPass = useCallback((item) => openAuth({ trigger: "getpass", item, role: "fan" }), [openAuth]);
  const handleSave = useCallback((item) => openAuth({ trigger: "save", item, role: "fan" }), [openAuth]);
  const handleClaim = useCallback((item) => openAuth({ trigger: "claim", item, role: "fan" }), [openAuth]);
  const handleOpenEventDetail = useCallback((item) => setSelectedItem(item), []);
  const handleCloseEventDetail = useCallback(() => setSelectedItem(null), []);
  const clearFilters = useCallback(() => {
    setActivePill(null);
    setKindFilter("all");
  }, []);

  /* Talent Pass and Partner Portal are both high-intent destinations:
     switching to either one also opens the Auth/KYC modal directly,
     pre-set to the matching tab, so the demo reaches the pre-filled
     form in a single tap. Switching back to Fan Discovery stays a
     plain content toggle - no modal. */
  const switchPortal = useCallback(
    (target) => {
      setPortalMode(target);
      if (target === "talent") openAuth({ trigger: "apply", role: "talent" });
      else if (target === "promoter") openAuth({ trigger: "apply", role: "promoter" });
    },
    [openAuth]
  );

  /* Talent's "Submit Verification & Continue" closes the modal and hands
     off to the parent (VibePassRoot), which mounts the real, unmodified
     Talent Pass Tab - no local dashboard stand-in lives in this file. */
  const handleTalentSubmit = useCallback(() => {
    closeAuth();
    if (onTalentVerified) onTalentVerified();
  }, [closeAuth, onTalentVerified]);

  /* Same pattern for Promoter's "Submit Registration & Continue". */
  const handlePromoterSubmit = useCallback(() => {
    closeAuth();
    if (onPromoterVerified) onPromoterVerified();
  }, [closeAuth, onPromoterVerified]);

  return (
    <div className="min-h-screen w-full" style={{ background: C.bg, fontFamily: FONT_BODY }}>
      <style>{`
        @keyframes vlFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes vlSlideUp { from { transform: translateY(48px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes vlMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes vlBounceDown { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        .vl-noscroll::-webkit-scrollbar { display: none; }
        .vl-noscroll { scrollbar-width: none; }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
      <SiteHeader
        portalMode={portalMode}
        onSwitchPortal={switchPortal}
        onSignIn={openAuth}
        onMockLogin={onMockLogin}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onNavClick={handleNavClick}
        searchInputRef={searchInputRef}
        kindFilter={kindFilter}
      />
      {referredGuest && (
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 lg:px-8">
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5"
            style={{
              borderColor: `${C.amethyst}55`,
              backgroundImage: "linear-gradient(90deg, rgba(34,197,94,0.10), rgba(168,85,247,0.10))",
              animation: "vlFadeUp 0.35s ease",
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(168,85,247,0.18)" }}
              >
                <Share2 size={16} color={C.amethyst} />
              </span>
              <div>
                <p className="text-xs font-bold" style={{ color: C.textHi }}>
                  Welcome, Referred Guest!
                </p>
                <p className="text-xs" style={{ color: C.textMid }}>
                  You joined via a shared WhatsApp / Instagram link.
                </p>
              </div>
            </div>
            <button
              onClick={() => onMockLogin && onMockLogin()}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-transform active:scale-95"
              style={{ background: C.emerald, color: "#052E16" }}
            >
              <Zap size={13} />
              Quick Demo Login
            </button>
          </div>
        </div>
      )}
      <main>
        {(tutorialStep === 1 || tutorialStep === 2) && (
          <div
            className="fixed inset-0"
            style={{ background: "rgba(0,0,0,0.7)", zIndex: 1800, animation: "vlFadeUp 0.2s ease" }}
          />
        )}
        <HeroSection
          portalMode={portalMode}
          query={query}
          setQuery={setQuery}
          activePill={activePill}
          onSelectPill={selectPill}
          searchInputRef={searchInputRef}
          onOpenAuth={openAuth}
          tutorialStep={tutorialStep}
          onAdvanceTutorial={advanceTutorial}
          onSkipTutorial={skipTutorial}
        />
        <VerificationTicker />
        <TrendingModule
          items={displayItems}
          onGetPass={handleGetPass}
          onOpenDetail={handleOpenEventDetail}
          tutorialStep={tutorialStep}
          onAdvanceTutorial={advanceTutorial}
          onSkipTutorial={skipTutorial}
        />
        {tutorialStep === 3 && (
          <div
            className="fixed inset-x-0 bottom-6 mx-auto flex w-full max-w-xs items-center gap-3 rounded-2xl border p-4"
            style={{ background: C.surface, borderColor: C.line, zIndex: 1801, boxShadow: "0 12px 32px rgba(0,0,0,0.6)" }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", animation: "vlBounceDown 1.4s ease-in-out infinite" }}
            >
              <ChevronDown size={16} color={C.emerald} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase" style={{ color: C.emerald, letterSpacing: 1 }}>
                Step 3 of 3
              </p>
              <p className="mt-0.5 text-xs font-semibold" style={{ color: C.textHi }}>
                Scroll down for everything else
              </p>
            </div>
            <button
              type="button"
              onClick={advanceTutorial}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-transform active:scale-95 ${focusRing}`}
              style={{ background: C.emerald, color: "#052E16" }}
            >
              Got it
            </button>
          </div>
        )}
        <PreviewGrid
          items={displayItems}
          activePill={activePill}
          kindFilter={kindFilter}
          query={query}
          onGetPass={handleGetPass}
          onSave={handleSave}
          onClaim={handleClaim}
          onClearFilters={clearFilters}
          onOpenDetail={handleOpenEventDetail}
        />
        <FeatureHighlights />
      </main>
      <div id="site-footer">
        <SiteFooter onNavClick={handleNavClick} onOpenAuth={openAuth} />
      </div>
      {selectedItem && selectedItem.kind === "event" && (
        <EventDetailModal
          event={selectedItem}
          onClose={handleCloseEventDetail}
          onGetPass={handleGetPass}
        />
      )}
      {selectedItem && selectedItem.kind === "spot" && (
        <SpotDetailModal
          spot={selectedItem}
          onClose={handleCloseEventDetail}
          onClaim={handleClaim}
        />
      )}
      {authState && (
        <AuthModal
          authState={authState}
          onClose={closeAuth}
          onTalentVerified={handleTalentSubmit}
          onConsumerEnter={onConsumerEnter}
          onMockLogin={onMockLogin}
          onPromoterVerified={handlePromoterSubmit}
        />
      )}
    </div>
  );
}
/* ================================================================
   VIBE PASS — top-level entry gate
   Presentation build: boots straight into the public Landing Page
   (currentView defaults to "landing", not gated behind an invite
   link). Three ways into the real app from there, all handing off
   to the same existing, unmodified VibePassApp shell (Consumer Hub /
   Talent Pass Hub + splash intro), opened on the relevant hub:
     1. Completing Consumer sign-in or Talent KYC in the modal.
     2. The "Tester Mode" one-click mock login (header + modal).
     3. The Referred Guest banner's "Quick Demo Login" chip, unlocked
        via the Demo Control Bar's simulate trigger (or a real
        "?invite=" URL, still honoured for production realism).
   VibePassApp and everything it renders (ConsumerHub, TalentHub,
   HubSwitcher, SplashScreen) is untouched below this gate.
   ================================================================ */
/* True when the app was opened via a real external invite link (an
   SMS/email/social share pointing at a URL like "?invite=<code>").
   Seeds the Referred Guest banner on load so a genuine invite link
   still works without needing the Demo Control Bar's manual trigger. */
function isInviteEntry() {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("invite");
  } catch (e) {
    return false;
  }
}

export default function VibePassRoot() {
  const [currentView, setCurrentView] = useState("landing");
  const [entryHub, setEntryHub] = useState("consumer");
  const [referredGuest, setReferredGuest] = useState(() => isInviteEntry());

  const handleConsumerEnter = useCallback(() => {
    setEntryHub("consumer");
    setCurrentView("app");
  }, []);

  const handleTalentVerified = useCallback(() => {
    setEntryHub("talent");
    setCurrentView("app");
  }, []);

  const handlePromoterVerified = useCallback(() => {
    setEntryHub("promoter");
    setCurrentView("app");
  }, []);

  /* Powers both the header/modal "Tester Mode" buttons and the Referred
     Guest banner's "Quick Demo Login" chip: skips KYC entirely and drops
     straight into the real, unmodified app shell. Any of the three
     ROLES ids maps straight to its matching hub; anything else (e.g.
     the banner's no-arg call) falls back to consumer. */
  const handleMockLogin = useCallback((role) => {
    setEntryHub(role === "talent" || role === "promoter" ? role : "consumer");
    setCurrentView("app");
  }, []);

  const handleSimulateReferral = useCallback(() => setReferredGuest(true), []);

  if (currentView === "app") {
    return <VibePassApp initialHub={entryHub} />;
  }

  return (
    <div className="min-h-screen w-full" style={{ background: C.bg }}>
      <div
        className="flex flex-wrap items-center justify-center gap-2 border-b px-3 py-1.5 text-center"
        style={{ borderColor: C.line, background: "#08060C" }}
      >
        <span
          className="text-xs font-bold uppercase"
          style={{ color: C.textLo, letterSpacing: 1 }}
        >
          Demo Mode
        </span>
        {referredGuest ? (
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.emerald }}>
            <CheckCircle2 size={12} />
            Referred Guest simulation active
          </span>
        ) : (
          <button
            onClick={handleSimulateReferral}
            className="flex items-center gap-1.5 text-xs font-semibold underline decoration-dotted"
            style={{ color: C.amethyst }}
          >
            <Share2 size={11} />
            Simulate Entry from External App (e.g., WhatsApp / Instagram Link)
          </button>
        )}
      </div>
      <VibePassLandingPage
        referredGuest={referredGuest}
        onConsumerEnter={handleConsumerEnter}
        onTalentVerified={handleTalentVerified}
        onMockLogin={handleMockLogin}
        onPromoterVerified={handlePromoterVerified}
      />
    </div>
  );
}

/* Crash containment. Without this, any render error unmounts the whole tree
and leaves an empty <div id="root"> — a blank screen with no indication that
anything went wrong, which is precisely the failure this project already
shipped once. React has no hook equivalent for componentDidCatch, so this
stays a class component.

Source maps are enabled in the production build, so the stack shown here
points at real source lines rather than bundled output. */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error: error, info: null };
  }

  componentDidCatch(error, info) {
    this.setState({ error: error, info: info });
    /* Left in deliberately: this is the only breadcrumb a tester can copy out
    of a deployed build when reporting a crash. */
    console.error(`Vibe Pass crashed${this.props.label ? ` in ${this.props.label}` : ""}:`, error, info);
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const detail = this.state.info ? this.state.info.componentStack : "";

    return (
      <div
        className="flex min-h-screen w-full items-center justify-center px-6"
        style={{ background: C.bg }}
        role="alert"
      >
        <div className="w-full" style={{ maxWidth: 420 }}>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: `${C.danger}1F`, border: `1px solid ${C.danger}55` }}
          >
            <AlertTriangle size={20} color={C.danger} />
          </div>

          <h1
            className="mt-4 text-xl font-extrabold tracking-tight"
            style={{ color: C.textHi }}
          >
            {this.props.label ? `${this.props.label} hit an error` : "Something broke on this screen"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: C.textMid }}>
            {this.props.label
              ? "The other hubs are unaffected — switch tabs above to keep exploring, or reload to try this one again."
              : "This view hit an error and stopped rather than leaving you on a blank page. Reloading usually clears it."}
          </p>

          <button
            onClick={this.handleReload}
            className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-bold transition-transform active:scale-95"
            style={{ background: C.emerald, color: "#04140A" }}
          >
            Reload Vibe Pass
          </button>

          <details className="mt-5">
            <summary
              className="cursor-pointer text-xs font-semibold uppercase"
              style={{ color: C.textLo, letterSpacing: 1 }}
            >
              Technical details
            </summary>
            <pre
              className="mt-2 overflow-auto rounded-xl p-3 font-mono"
              style={{
                background: C.surface,
                border: `1px solid ${C.line}`,
                color: C.textMid,
                fontSize: 10,
                maxHeight: 220,
                whiteSpace: "pre-wrap",
              }}
            >
              {String(this.state.error)}
              {detail}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <VibePassRoot />
  </AppErrorBoundary>
);
