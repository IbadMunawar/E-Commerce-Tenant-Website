export interface Product {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  originalPrice: number;
  imageUrl: string;
  category: string;
  badge?: string;
}

export const products: Product[] = [
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    shortDescription: '48MP ProCamera. A17 Pro chip. Titanium design.',
    description:
      'The iPhone 15 Pro features a surgical-grade titanium design, the powerful A17 Pro chip, and a pro camera system with a 48MP main camera. With Action Button customization, USB 3 speeds, and an immersive Super Retina XDR display, it redefines what a smartphone can do. Available in Natural Titanium, Blue Titanium, White Titanium, and Black Titanium.',
    originalPrice: 329000,
    imageUrl: '/iphone-15-pro.png',
    category: 'Smartphones',
    badge: 'Best Seller',
  },
  {
    id: 'macbook-air-m3',
    name: 'MacBook Air M3',
    shortDescription: 'Supercharged by M3. Impossibly thin, remarkably capable.',
    description:
      'The MacBook Air with M3 chip is thin, light, and the most capable laptop Apple has ever made. With up to 18 hours of battery life, a fanless design, a stunning Liquid Retina display up to 15.3 inches, and support for two external displays, M3 makes MacBook Air faster and more capable than ever.',
    originalPrice: 389000,
    imageUrl: '/macbook-air-m3.png',
    category: 'Laptops',
    badge: 'New',
  },
  {
    id: 'sony-wh1000xm5',
    name: 'Sony WH-1000XM5',
    shortDescription: 'Industry-leading noise cancellation. 30-hour battery.',
    description:
      'The Sony WH-1000XM5 headphones feature industry-leading noise cancellation powered by two processors and eight microphones. With 30-hour battery life, multipoint connection, and Speak-to-Chat technology that automatically pauses music when you start a conversation, these are the ultimate wireless headphones for audiophiles and professionals alike.',
    originalPrice: 89000,
    imageUrl: '/sony-wh1000xm5.png',
    category: 'Audio',
    badge: 'Top Rated',
  },
  {
    id: 'ps5-console',
    name: 'PlayStation 5',
    shortDescription: 'Play has no limits. Next-gen gaming starts here.',
    description:
      'The PlayStation 5 console unleashes new gaming possibilities. Discover lightning-fast loading with an ultra-high speed SSD, deeper immersion with haptic feedback, adaptive triggers, and 3D Audio, and an all-new generation of incredible PlayStation games. Experience 4K gaming at up to 120fps with ray tracing support.',
    originalPrice: 159000,
    imageUrl: '/ps5.png',
    category: 'Gaming',
    badge: 'Hot Deal',
  },
  {
    id: 'samsung-galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    shortDescription: 'Galaxy AI. 200MP Camera. Built-in S Pen.',
    description:
      'The Samsung Galaxy S24 Ultra is the ultimate Android powerhouse featuring Galaxy AI, a 200MP camera system with 100x Space Zoom, a built-in S Pen for seamless productivity, and a 5000mAh battery with 45W fast charging. With titanium frame construction and a 6.8" Dynamic AMOLED 2X display at 120Hz, it stands at the pinnacle of mobile technology.',
    originalPrice: 319000,
    imageUrl: '/iphone-15-pro.png', // reused placeholder
    category: 'Smartphones',
  },
  {
    id: 'dell-xps-15',
    name: 'Dell XPS 15',
    shortDescription: 'Intel Core Ultra 9. OLED display. Premium build.',
    description:
      'The Dell XPS 15 combines stunning OLED display technology with Intel Core Ultra 9 processing power and NVIDIA GeForce RTX 4070 graphics. Housed in a machined aluminum chassis with a near-borderless InfinityEdge display, it delivers professional-grade performance for content creators, developers, and power users demanding the very best.',
    originalPrice: 449000,
    imageUrl: '/macbook-air-m3.png', // reused placeholder
    category: 'Laptops',
    badge: 'Premium',
  },
  {
    id: 'airpods-pro-2',
    name: 'AirPods Pro 2nd Gen',
    shortDescription: 'Adaptive Audio. Active Noise Cancellation.',
    description:
      'AirPods Pro (2nd generation) with the H2 chip deliver up to 2x more Active Noise Cancellation, Adaptive Transparency that reduces loud environmental sounds, and Personalized Spatial Audio that places sound all around you. The MagSafe Charging Case with Precision Finding provides up to 30 hours of battery life and a built-in speaker for easy locating.',
    originalPrice: 69000,
    imageUrl: '/sony-wh1000xm5.png', // reused placeholder
    category: 'Audio',
  },
  {
    id: 'nintendo-switch-oled',
    name: 'Nintendo Switch OLED',
    shortDescription: 'Vibrant 7" OLED screen. Play anywhere.',
    description:
      'The Nintendo Switch – OLED Model features a vibrant 7-inch OLED screen with vivid colors and crisp contrast for portable gaming. With a wide adjustable stand, enhanced audio, 64GB internal storage, and a wired LAN port in the dock, it offers an elevated gaming experience whether at home or on the go.',
    originalPrice: 89000,
    imageUrl: '/ps5.png', // reused placeholder
    category: 'Gaming',
  },
];
