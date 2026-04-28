
export const MOCK_SERVICES = [
  {
    id: 's1',
    name: 'Home Cleaning',
    provider: 'Elite Shine',
    rating: 4.8,
    neighbors: 156,
    price: 599,
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6954?auto=format&fit=crop&q=80&w=400',
    premium: true,
    created_at: new Date().toISOString()
  },
  {
    id: 's2',
    name: 'AC Servicing',
    provider: 'Cool Breeze Tech',
    rating: 4.9,
    neighbors: 89,
    price: 450,
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&q=80&w=400',
    premium: false,
    created_at: new Date().toISOString()
  },
  {
    id: 's3',
    name: 'Plumbing Works',
    provider: 'Swift Fix',
    rating: 4.7,
    neighbors: 210,
    price: 299,
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=400',
    premium: false,
    created_at: new Date().toISOString()
  },
  {
    id: 's4',
    name: 'Electrician',
    provider: 'Sparky Solutions',
    rating: 4.6,
    neighbors: 124,
    price: 349,
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=400',
    premium: true,
    created_at: new Date().toISOString()
  }
];

export const MOCK_ESSENTIALS = [
  {
    id: 'e1',
    name: 'Organic Milk 1L',
    store: 'Fresh Dairy',
    price: 75,
    delivery_time: '15 mins',
    image_url: 'https://images.unsplash.com/photo-1563636619-e910ef49e9cf?auto=format&fit=crop&q=80&w=400',
    created_at: new Date().toISOString()
  },
  {
    id: 'e2',
    name: 'Whole Wheat Bread',
    store: 'Artisan Bakery',
    price: 45,
    delivery_time: '20 mins',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400',
    created_at: new Date().toISOString()
  },
  {
    id: 'e3',
    name: 'Farm Fresh Eggs (12pcs)',
    store: 'Local Grocers',
    price: 120,
    delivery_time: '10 mins',
    image_url: 'https://images.unsplash.com/photo-1518569147015-9e4c2f8541a5?auto=format&fit=crop&q=80&w=400',
    created_at: new Date().toISOString()
  }
];

export const MOCK_DEALS = [
  {
    id: 'd1',
    name: 'Pizza Mania',
    store: 'Italian Crust',
    offer: 'Buy 1 Get 1 Free',
    price: 499,
    created_at: new Date().toISOString()
  },
  {
    id: 'd2',
    name: 'Salad Combo',
    store: 'Healthy Bites',
    offer: 'Flat 30% OFF',
    price: 250,
    created_at: new Date().toISOString()
  },
  {
    id: 'd3',
    name: 'Evening Snacks',
    store: 'Chai Point',
    offer: 'Combo @ ₹99',
    price: 99,
    created_at: new Date().toISOString()
  }
];

export const MOCK_VENDORS = [
  { 
    id: 'demo1', 
    name: 'Passwala Partner Store', 
    category: 'Grocery', 
    distance: '0.2 km', 
    rating: 4.9, 
    verified: true, 
    coords: { x: '35%', y: '50%' }, 
    status: 'OPEN',
    business_name: 'Passwala Partner Store'
  },
  { 
    id: 'demo2', 
    name: 'Fresh Daily Mart', 
    category: 'Dairy', 
    distance: '0.8 km', 
    rating: 4.5, 
    verified: true, 
    coords: { x: '70%', y: '65%' }, 
    status: 'OPEN',
    business_name: 'Fresh Daily Mart'
  },
  { 
    id: 'demo3', 
    name: 'Green Leaf Veggies', 
    category: 'Vegetables', 
    distance: '1.5 km', 
    rating: 4.7, 
    verified: true, 
    coords: { x: '20%', y: '40%' }, 
    status: 'OPEN',
    business_name: 'Green Leaf Veggies'
  },
  { 
    id: 'demo4', 
    name: 'The Crusty Bun', 
    category: 'Bakery', 
    distance: '2.1 km', 
    rating: 4.8, 
    verified: false, 
    coords: { x: '85%', y: '30%' }, 
    status: 'OPEN',
    business_name: 'The Crusty Bun'
  }
];

export const MOCK_POSTS = [
  {
    id: 'p1',
    content: "Has anyone tried the new AC repair pro 'Cool Breeze'? Need to service my unit before summer peaks.",
    likes_count: 12,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'p2',
    content: "Looking for a reliable domestic help in Satellite area. Any recommendations from neighbors?",
    likes_count: 5,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'p3',
    content: "Found a set of keys near the community park this morning. Kept them with the security guard at Gate 2.",
    likes_count: 24,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=800'
  }
];

export const MOCK_USERS = [
  { id: 'u1', full_name: 'Karan Kumar', phone: '9876543210', email: 'karan@example.com', role: 'BUYER', created_at: new Date().toISOString() },
  { id: 'u2', full_name: 'Rahul Sharma', phone: '9888877777', email: 'rahul@example.com', role: 'BUYER', created_at: new Date().toISOString() }
];

export const MOCK_RIDERS = [
  { id: 'r1', full_name: 'Amit Singh', phone: '9111122222', vehicle_no: 'GJ-01-AB-1234', is_verified: true, status: 'ONLINE', rating: 4.8 },
  { id: 'r2', full_name: 'Suresh Patel', phone: '9222233333', vehicle_no: 'GJ-01-CD-5678', is_verified: false, status: 'OFFLINE', rating: 4.2 }
];

export const MOCK_ADMIN_VENDORS = [
  { id: 'v1', business_name: 'Fresh Dairy', category: 'Dairy', phone: '9555544444', is_verified: true, address: 'Satellite, Ahmedabad' },
  { id: 'v2', business_name: 'Elite Shine', category: 'Cleaning', phone: '9666677777', is_verified: true, address: 'Bopal, Ahmedabad' }
];

export const MOCK_BOOKINGS = [
  { id: 'b1', item_name: 'Home Cleaning', price: 599, status: 'PENDING', created_at: new Date().toISOString() },
  { id: 'b2', item_name: 'Organic Milk 1L', price: 75, status: 'DELIVERED', created_at: new Date().toISOString() }
];
