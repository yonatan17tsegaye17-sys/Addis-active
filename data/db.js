export const DB = {
  version: "1.0.0-beta",
  userProfile: {
    username: 'Addis Runner',
    homeArea: 'Bole / Edna Mall',
    primaryActivity: 'run',
    fitnessLevel: 'Recreational',
    totalDistanceLogged: '14.5 KM',
    activeGoals: [
      { id: 'g1', title: 'Complete First 5K', target: '5 KM', progress: '3.2 KM', status: 'In Progress' },
      { id: 'g2', title: 'Entoto Ridge Hike', target: '10.5 KM', progress: '0 KM', status: 'Not Started' }
    ]
  },
  aiCoachPrompts: [
    { q: 'How do I handle running at 2,355m altitude in Addis?', a: 'Start slower than your usual pace by 20–30 seconds per kilometer. Hydrate early and let your cardiovascular system adjust.' },
    { q: 'Where are the best corridor paths and parks?', a: 'Unity Park, Sheger Riverside Park, Churchill Avenue corridor, and Entoto Natural Park offer pristine walking and running paths.' }
  ],
  routes: [
    {
      id: 'r1',
      name: 'Entoto Forest Ridge Loop',
      activity: 'hike',
      area: 'Entoto Mountain',
      distance: '10.5 KM',
      elevation: '+340m Gain',
      difficulty: 'Challenging',
      estimatedTime: '1h 45m',
      startingPoint: 'Entoto Natural Park Gate 1',
      level: 'Advanced',
      surface: 'Trail / Loose Gravel & Eucalyptus Canopy',
      facilities: ['Parking: Available', 'Restrooms: Gate 1 & Summit', 'Water: Stations at Gate', 'Lighting: Daylight Only'],
      desc: 'High-altitude trail winding through dense eucalyptus canopy with sweeping panoramas of Addis Ababa.',
      communityNotes: '“Bring hydration and watch your footing on loose gravel.” — Bertusew Community',
      image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80',
      coords: [9.0765, 38.7421]
    },
    {
      id: 'r2',
      name: 'Bole Boulevard Sunrise Tarmac',
      activity: 'run',
      area: 'Bole / Edna Mall',
      distance: '5.2 KM',
      elevation: '+45m Gain',
      difficulty: 'Moderate',
      estimatedTime: '30m',
      startingPoint: 'Edna Mall Main Junction',
      level: 'Recreational',
      surface: 'Smooth Urban Tarmac & Paved Sidewalks',
      facilities: ['Parking: Street / Mall', 'Restrooms: Commercial Hubs', 'Water: Cafes & Shops', 'Lighting: Excellent Streetlights'],
      desc: 'Smooth urban tarmac stretch featuring wide sidewalks, perfect for early morning tempo runs.',
      communityNotes: '“Best run right at 6:00 AM when the air is cool and traffic is low.”',
      image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80',
      coords: [9.0192, 38.7890]
    },
    {
      id: 'r3',
      name: 'Unity Park & Palace Grounds Stride',
      activity: 'walk',
      area: 'Arat Kilo / Grand Palace',
      distance: '3.8 KM',
      elevation: '+20m Gain',
      difficulty: 'Easy',
      estimatedTime: '45m',
      startingPoint: 'Unity Park Main Gate',
      level: 'All Levels',
      surface: 'Paved Stone Walkways & Landscaped Gardens',
      facilities: ['Parking: Secure Gate', 'Restrooms: Inside Park', 'Water: Kiosks', 'Lighting: Full Park Lighting'],
      desc: 'Scenic historic walk through beautifully restored palace grounds, indigenous greenery, and exhibition spaces.',
      communityNotes: '“Wonderful weekend family walking environment.”',
      image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1200&q=80',
      coords: [9.0250, 38.7570]
    },
    {
      id: 'r4',
      name: 'Churchill Avenue & Riverside Corridor',
      activity: 'run',
      area: 'Churchill Ave / City Center',
      distance: '6.0 KM',
      elevation: '+30m Gain',
      difficulty: 'Moderate',
      estimatedTime: '35m',
      startingPoint: 'Taitu Hotel Junction',
      level: 'Intermediate',
      surface: 'New Asphalt Corridor & Riverside Walkway',
      facilities: ['Parking: Public Lots', 'Restrooms: Public Plazas', 'Water: Available Along Corridor', 'Lighting: Modern LED Streetlights'],
      desc: 'Newly revamped urban corridor featuring wide pedestrian walkways, greenery, and smooth running tarmac.',
      communityNotes: '“Part of the new Addis Ababa corridor transformation project.”',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      coords: [9.0120, 38.7520]
    }
  ],
  videos: [
    {
      id: 'v1',
      title: 'Entoto Mountain Ridge Walkthrough',
      area: 'Entoto Mountain',
      duration: '3:45',
      thumbnail: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80',
      desc: 'Visual preview of high-altitude eucalyptus trails.'
    }
  ],
  events: [
    {
      id: 'e1',
      title: 'Bertusew Sunday Community Run',
      activityId: 'run',
      date: '2026-10-04',
      startTime: '06:30 AM',
      location: 'Entoto Park Gate',
      distance: '5K / 10K',
      description: 'Steady conversational morning run followed by traditional coffee.',
      status: 'UPCOMING'
    }
  ],
  badges: [
    { id: 'b1', name: 'FIRST STEP', icon: '👟', desc: 'Complete your first activity.', unlocked: true },
    { id: 'b2', name: 'FIRST 5K', icon: '🏃', desc: 'Complete a 5K session.', unlocked: false }
  ],
  territories: [
    { id: 't1', name: 'Bole & Airport Zone', status: 'UNLOCKED', icon: '✈️', desc: 'Urban tarmac corridors.', routesCount: 3 },
    { id: 't2', name: 'Entoto Mountain Range', status: 'LOCKED', icon: '🌲', desc: 'High-altitude eucalyptus forests.', routesCount: 5 },
    { id: 't3', name: 'Unity & Palace Grounds', status: 'LOCKED', icon: '🏛️', desc: 'Historic gardens and walking paths.', routesCount: 2 }
  ]
};
