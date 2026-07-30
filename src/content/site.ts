/**
 * ============================================================
 *  EDIT EVERYTHING HERE
 *  All site content (brand, contact, trainers, gallery,
 *  testimonials, pricing) lives in this single file.
 *  Change text / images here — no component edits needed.
 * ============================================================
 */
import trainer1 from "@/assets/trainer-1.jpg";
import trainer2 from "@/assets/trainer-2.jpg";
import trainer3 from "@/assets/trainer-3.jpg";
import trainer4 from "@/assets/trainer-4.jpg";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";

export const BRAND = {
  /** Shown in the nav & footer, split into two parts for the red accent */
  namePart1: "NEW FITNESS",
  namePart2: "ZONE",
  fullName: "New Fitness Zone",
  tagline: "Weight Lifting & Strength Training Specialists",
  trialDays: 2,
};

/** CONTACT PLACEHOLDERS — replace with your real details */
export const CONTACT = {
  address: "Your Gym Address, City, State – PIN Code",
  phone: "+91 00000 00000",
  email: "yourgym@gmail.com",
  /** Digits only, with country code (used for the WhatsApp button) */
  whatsapp: "910000000000",
  hours: "Mon–Sun · 5:00 AM – 11:00 PM",
  /** Paste your Google Maps embed URL here */
  mapEmbedUrl:
    "https://www.google.com/maps?q=India&output=embed",
};

/** TRAINERS — head trainer first, 5 editable placeholders after */
export const TRAINERS = [
  {
    img: trainer1,
    name: "Harshvardhan Koli",
    role: "Head Trainer",
    tags: ["Weight Lifting", "Strength Training"],
    exp: "Head Coach",
    isHead: true,
  },
  { img: trainer2, name: "Trainer 2", role: "Strength Coach", tags: ["Strength", "Powerlifting"], exp: "Coach" },
  { img: trainer3, name: "Trainer 3", role: "Muscle Building Coach", tags: ["Hypertrophy", "Weight Lifting"], exp: "Coach" },
  { img: trainer4, name: "Trainer 4", role: "Fat Loss Coach", tags: ["Fat Loss", "Conditioning"], exp: "Coach" },
  { img: trainer2, name: "Trainer 5", role: "Functional Fitness Coach", tags: ["Functional", "Mobility"], exp: "Coach" },
  { img: trainer3, name: "Trainer 6", role: "Personal Trainer", tags: ["Personal Training", "Nutrition"], exp: "Coach" },
];

/** GALLERY — premium placeholders, swap the `src` with your gym photos */
export const GALLERY = [
  { src: g1, alt: "Heavy deadlift session", cls: "row-span-2" },
  { src: g4, alt: "Strength training floor" },
  { src: g2, alt: "Squat rack area" },
  { src: g3, alt: "Free weights zone", cls: "row-span-2" },
];

/** MEMBERSHIP PLANS — pricing in Indian Rupees */
export const PLANS = [
  {
    name: "Monthly",
    price: "1,499",
    period: "/month",
    tag: "Flexible",
    feats: [
      "Full gym & weight-lifting floor access",
      "Strength training zone",
      "Locker & drinking water",
      "Free fitness assessment",
    ],
  },
  {
    name: "Quarterly",
    price: "3,999",
    period: "/3 months",
    tag: "Popular",
    feats: [
      "Everything in Monthly",
      "1 personal training session",
      "Body composition check",
      "Basic diet guidance",
    ],
  },
  {
    name: "Annual",
    price: "11,999",
    period: "/year",
    tag: "Best Value",
    recommended: true,
    feats: [
      "Everything in Quarterly",
      "6 personal training sessions",
      "Custom strength program",
      "Monthly progress review",
      "2 guest passes",
    ],
  },
  {
    name: "Elite Personal",
    price: "5,999",
    period: "/month",
    tag: "Premium",
    feats: [
      "Daily 1-on-1 coaching",
      "Powerlifting & strength specialisation",
      "Weekly diet plan updates",
      "Priority slot booking",
      "Full progress tracking",
    ],
  },
];

/** TESTIMONIALS — real-sounding Indian member reviews */
export const TESTIMONIALS = [
  {
    name: "Rohan Deshmukh",
    role: "College student · Gained 7 kg",
    text: "I joined mainly to start weight lifting properly. Harshvardhan sir corrected my form from day one and now my squat and deadlift have gone up a lot. The strength training setup here is genuinely good.",
  },
  {
    name: "Sneha Patil",
    role: "Working professional",
    text: "I come after office hours and the gym is never too crowded. Staff is polite and the ladies feel comfortable training here. Lost around 6 kg in five months without any crash dieting.",
  },
  {
    name: "Aditya Sharma",
    role: "Software engineer",
    text: "Was training at home for two years with no progress. Structured strength programme here made the difference. Equipment is well maintained and the free weights section is solid.",
  },
  {
    name: "Priyanka Joshi",
    role: "Teacher · New to the gym",
    text: "I was nervous about lifting weights but the trainers explained everything patiently. Started with basics and now I train with barbells regularly. Very supportive environment.",
  },
  {
    name: "Karan Mehta",
    role: "Powerlifting enthusiast",
    text: "Good bars, proper plates and a platform to pull on — that's all I needed. Coaches actually understand powerlifting programming, which is rare around here.",
  },
  {
    name: "Ananya Nair",
    role: "MBA student",
    text: "Affordable fees for the quality you get. The BMI check and diet guidance helped me stay consistent. Been six months and I'm much stronger than before.",
  },
];
