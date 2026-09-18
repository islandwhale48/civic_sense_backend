/**
 * Central In-Memory Data Store & Seed Data Repository
 * Models the full SRS schema (Issues, Reports, Tickets, Resolutions, Status History)
 */

let simulatedOffsetHours = 0;

export const seedIssues = [
  {
    id: "issue-1",
    issueNumber: "CKH-101",
    ticketId: "TKT-WRD14-2026-1042",
    title: "Hazardous Deep Pothole on Main Market Road",
    description: "A large 2-foot deep pothole has formed right in front of the Central Market entrance. Two-wheelers are swerving dangerously into oncoming traffic.",
    category: "Roads & Traffic",
    status: "in_progress",
    priority: "High",
    location: "Market Road, Sector 14, Central Ward",
    latitude: 28.6139,
    longitude: 77.2090,
    geoData: {
      address: "Market Road, Sector 14, Central Ward, New Delhi",
      locality: "Sector 14",
      ward: "Central Ward #14",
      district: "New Delhi Central",
      state: "Delhi"
    },
    jurisdiction: {
      type: "Municipality / Corporation",
      code: "URBAN_CORP",
      ward: "Central Ward #14",
      name: "Delhi Municipal Corporation (Central Ward #14)"
    },
    departmentType: "ENGINEERING",
    assignedAuthority: "Central Ward #14 - Public Works Department (PWD)",
    imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800",
    upvotes: 142,
    upvotedByUser: false,
    linkedReportsCount: 3,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // 36 hours ago
    reporter: {
      name: "Rahul Sharma",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
      badge: "Civic Champion"
    },
    reportsList: [
      {
        id: "rep-1",
        reporterName: "Rahul Sharma",
        description: "Hazardous pothole right outside Central Market.",
        imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800",
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "rep-2",
        reporterName: "Meera Gupta",
        description: "Nearly skid my bike here last evening.",
        imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800",
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
      }
    ],
    timeline: [
      { status: "Reported", date: "36 hours ago", detail: "Ticket raised and routed to Central Ward #14 Secretary Panel." },
      { status: "Accepted", date: "30 hours ago", detail: "Ward Junior Engineer acknowledged receipt." },
      { status: "In Progress", date: "18 hours ago", detail: "Road maintenance crew dispatched with cold asphalt mix." }
    ],
    comments: [
      { id: "c1", author: "Priya Mehta", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", text: "I almost fell off my scooter here yesterday! Glad it's being addressed.", date: "1 day ago" }
    ]
  },
  {
    id: "issue-2",
    issueNumber: "CKH-102",
    ticketId: "TKT-WRD22-2026-2189",
    title: "Overflowing Garbage Bin & Medical Waste Spillage near Green Park",
    description: "The commercial waste bin at Green Park East gate hasn't been cleared in over 5 days. Waste is spilling onto the pedestrian path causing severe foul odor and stray animal menace.",
    category: "Sanitation & Waste",
    status: "pending",
    priority: "Critical",
    location: "Green Park East Gate, Block C, Ward #22",
    latitude: 28.6210,
    longitude: 77.2150,
    geoData: {
      address: "Green Park East Gate, Block C, Ward #22",
      locality: "Green Park",
      ward: "Green Park Ward #22",
      district: "South District",
      state: "Delhi"
    },
    jurisdiction: {
      type: "Municipality / Corporation",
      code: "URBAN_CORP",
      ward: "Green Park Ward #22",
      name: "Municipal Corporation (Green Park Ward #22)"
    },
    departmentType: "SANITATION",
    assignedAuthority: "Ward #22 - Solid Waste Management & Sanitation Board",
    imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800",
    upvotes: 94,
    upvotedByUser: true,
    linkedReportsCount: 2,
    createdAt: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(), // 52 hours ago -> OVERDUE for Critical (24h SLA)
    reporter: {
      name: "Ananya Iyer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
      badge: "Community Lead"
    },
    reportsList: [
      {
        id: "rep-3",
        reporterName: "Ananya Iyer",
        description: "Commercial bin overflowing for 5 days.",
        imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800",
        createdAt: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString()
      }
    ],
    timeline: [
      { status: "Reported", date: "52 hours ago", detail: "Ticket raised to Ward #22 Sanitation Board." },
      { status: "Escalated Level 1", date: "28 hours ago", detail: "Critical 24h SLA breached. Escalated to Zonal Sanitation Officer." }
    ],
    comments: [
      { id: "c2", author: "Vikram Singh", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", text: "Stray animals are tearing open bags every night. Needs urgent truck dispatch!", date: "8 hours ago" }
    ]
  },
  {
    id: "issue-3",
    issueNumber: "CKH-103",
    ticketId: "TKT-WRD07-2026-3401",
    title: "Broken Streetlight Array on Outer Ring Road Flyover",
    description: "Four consecutive solar streetlights have stopped functioning on the northbound lane near Metro Pillar 114, rendering the road pitch black at night.",
    category: "Electricity & Lighting",
    status: "resolved",
    priority: "High",
    location: "Outer Ring Road, Pillar 114, North Ward #7",
    latitude: 28.6280,
    longitude: 77.2200,
    geoData: {
      address: "Outer Ring Road, Pillar 114, North Ward #7",
      locality: "Ring Road Sector",
      ward: "North Ward #7",
      district: "North District",
      state: "Delhi"
    },
    jurisdiction: {
      type: "Municipality / Corporation",
      code: "URBAN_CORP",
      ward: "North Ward #7",
      name: "North Delhi Municipal Corporation"
    },
    departmentType: "ELECTRICAL",
    assignedAuthority: "North Ward #7 - State Electricity Distribution Company (Discom)",
    imageUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=800",
    upvotes: 210,
    upvotedByUser: false,
    linkedReportsCount: 4,
    createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    reporter: {
      name: "David Miller",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
      badge: "Verified Resident"
    },
    reportsList: [
      {
        id: "rep-4",
        reporterName: "David Miller",
        description: "Pitch dark on flyover due to 4 broken lamps.",
        imageUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=800",
        createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString()
      }
    ],
    resolution: {
      id: "res-1",
      submittedBy: "Secretary K. Raman (North Ward #7)",
      description: "Replaced 4 burnt LED driver modules and repaired overhead wiring. All 4 luminaires are 100% operational.",
      afterImageUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=800",
      submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      reviewStatus: "APPROVED",
      reviewedBy: "Admin Inspector V. Verma",
      reviewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      adminNotes: "Resolution verified against site inspection photo. Issue successfully closed."
    },
    timeline: [
      { status: "Reported", date: "4 days ago", detail: "Citizen report submitted and routed to Electrical Dept." },
      { status: "Accepted", date: "3 days ago", detail: "Discom maintenance wing assigned repair crew." },
      { status: "In Progress", date: "2 days ago", detail: "Bucket truck on site replacing luminaire modules." },
      { status: "Resolution Submitted", date: "24 hours ago", detail: "Ward Secretary submitted completion evidence and after-photo." },
      { status: "Resolved", date: "12 hours ago", detail: "Admin Review approved resolution. Marked as DONE." }
    ],
    comments: [
      { id: "c3", author: "Sunita Rao", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150", text: "Checked tonight, all lights are working great now! Thanks CivicSense!", date: "12 hours ago" }
    ]
  },
  {
    id: "issue-4",
    issueNumber: "CKH-104",
    ticketId: "TKT-WRD14-2026-4912",
    title: "Clean Water Pipeline Burst Flooding Sub-lane 3",
    description: "A major main pipe joint has ruptured, wasting hundreds of gallons of clean drinking water and causing localized waterlogging near residential building gates.",
    category: "Water Supply",
    status: "resolution_submitted",
    priority: "Critical",
    location: "Sub-lane 3, Lakeview Apartments, Central Ward #14",
    latitude: 28.6190,
    longitude: 77.2010,
    geoData: {
      address: "Sub-lane 3, Lakeview Apartments, Central Ward #14",
      locality: "Lakeview",
      ward: "Central Ward #14",
      district: "New Delhi Central",
      state: "Delhi"
    },
    jurisdiction: {
      type: "Municipality / Corporation",
      code: "URBAN_CORP",
      ward: "Central Ward #14",
      name: "Delhi Jal Board (Central Ward #14)"
    },
    departmentType: "WATER_SEWERAGE",
    assignedAuthority: "Central Ward #14 - City Water Supply & Sewerage Board (Jal Board)",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800",
    upvotes: 175,
    upvotedByUser: true,
    linkedReportsCount: 5,
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    reporter: {
      name: "Rohan Verma",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
      badge: "Active Citizen"
    },
    reportsList: [
      {
        id: "rep-5",
        reporterName: "Rohan Verma",
        description: "Drinking water pipe burst flooding road.",
        imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800",
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
      }
    ],
    resolution: {
      id: "res-2",
      submittedBy: "Secretary P. Sen (Central Ward #14 Jal Board)",
      description: "Excavated pipe joint, welded leak clamp sleeve, and backfilled trench with concrete. Pressure restored to normal.",
      afterImageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800",
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      reviewStatus: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      adminNotes: null
    },
    timeline: [
      { status: "Reported", date: "30 hours ago", detail: "Emergency water leak logged." },
      { status: "Accepted", date: "26 hours ago", detail: "Jal Board emergency valves shut down." },
      { status: "In Progress", date: "16 hours ago", detail: "Heavy pipeline repair in progress." },
      { status: "Resolution Submitted", date: "2 hours ago", detail: "Repair completed. Awaiting Admin Review approval." }
    ],
    comments: [
      { id: "c4", author: "Deepak S.", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150", text: "Water supply was restored around 4 PM. Waiting for road to dry.", date: "1 hour ago" }
    ]
  }
];

export const seedAuthorities = [
  {
    ward_id: "WARD-CENTRAL-14",
    ward_name: "Central Ward #14",
    local_body: "Delhi Municipal Corporation (Central Ward #14)",
    password: "WardPass14",
    department: "Public Works & Engineering",
    createdAt: new Date().toISOString()
  },
  {
    ward_id: "WARD-GREENPARK-22",
    ward_name: "Green Park Ward #22",
    local_body: "Municipal Corporation (Green Park Ward #22)",
    password: "WardPass22",
    department: "Solid Waste & Sanitation Board",
    createdAt: new Date().toISOString()
  },
  {
    ward_id: "WARD-RKM-7",
    ward_name: "RKM Ward #7",
    local_body: "NDMC Municipal Body (RKM Ward #7)",
    password: "WardPass7",
    department: "Electrical & Street Lighting",
    createdAt: new Date().toISOString()
  },
  {
    ward_id: "WARD-LAJPAT-8",
    ward_name: "Lajpat Nagar Ward #8",
    local_body: "South Delhi Corporation (Lajpat Nagar Ward #8)",
    password: "WardPass8",
    department: "Civic Health & Sanitation",
    createdAt: new Date().toISOString()
  },
  {
    ward_id: "WARD-VASANT-12",
    ward_name: "Vasant Kunj Ward #12",
    local_body: "South Delhi Municipal Corporation (Ward #12)",
    password: "WardPass12",
    department: "Drainage & Infrastructure",
    createdAt: new Date().toISOString()
  }
];

export const seedUsers = [
  {
    id: "usr-prakash",
    name: "Prakash Kumar",
    email: "prakash@civicsense.gov.in",
    password: "password123",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
    badge: "Civic Champion",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-rahul",
    name: "Rahul Sharma",
    email: "rahul@gmail.com",
    password: "password123",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    badge: "Active Citizen",
    createdAt: new Date().toISOString()
  }
];

export const memoryStore = {
  issues: [...seedIssues],
  authorities: [...seedAuthorities],
  users: [...seedUsers],
  simulatedOffsetHours: 0
};

export function getIssuesStore() {
  return memoryStore.issues;
}

export function setIssuesStore(newIssues) {
  memoryStore.issues = newIssues;
}

export function getAuthoritiesStore() {
  return memoryStore.authorities;
}

export function setAuthoritiesStore(newAuthorities) {
  memoryStore.authorities = newAuthorities;
}

export function getUsersStore() {
  return memoryStore.users;
}

export function setUsersStore(newUsers) {
  memoryStore.users = newUsers;
}

export function getSimulatedOffset() {
  return memoryStore.simulatedOffsetHours;
}

export function setSimulatedOffset(hours) {
  memoryStore.simulatedOffsetHours = hours;
}

export function addSimulatedOffset(hours) {
  memoryStore.simulatedOffsetHours += hours;
  return memoryStore.simulatedOffsetHours;
}


