export const DB = {
  version: "1.0.0-beta",
  activitiesMeta: {
    run: { title: 'Running', icon: '🏃', desc: 'From sunrise tarmac loops to high-altitude endurance engines.' },
    walk: { title: 'Walking', icon: '🚶', desc: 'Urban promenades, green parks, and community stride sessions.' },
    bike: { title: 'Cycling', icon: '🚴', desc: 'Road rides, mountain climbs, and urban group cycling.' },
    swim: { title: 'Swimming', icon: '🏊', desc: 'Pool facilities, aquatic training, and fitness laps.' },
    hike: { title: 'Hiking', icon: '🥾', desc: 'Mountain trails, eucalyptus forests, and ridge scrambles.' },
    football: { title: 'Football', icon: '⚽', desc: 'Pitch matches, turf fields, and community games.' },
    fitness: { title: 'Fitness', icon: '🏋️', desc: 'Outdoor workouts, strength conditioning, and functional movement.' }
  },
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
      tags: ['Altitude', 'Forest', 'Scenic', 'Trail'],
      desc: '[DEMO] High-altitude trail winding through dense eucalyptus canopy with sweeping panoramas of Addis Ababa.',
      communityNotes: '“Bring hydration and watch your footing on loose gravel.” — Bertusew Community',
      videoURL: 'https://www.youtube.com/embed/placeholder',
      image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80',
      gpxCoordinates: [[9.0765, 38.7421], [9.0812, 38.7490], [9.0721, 38.7543]],
      savesCount: 42,
      completionsCount: 18
    },
    {
      id: 'r2',
      name: 'Bole Boulevard Sunrise Strides',
      activity: 'run',
      area: 'Bole / Edna Mall',
      distance: '5.2 KM',
      elevation: '+45m Gain',
      difficulty: 'Moderate',
      estimatedTime: '30m',
      startingPoint: 'Edna Mall Main Junction',
      level: 'Recreational',
      tags: ['Tarmac', 'Urban', 'Flat', 'Fast'],
      desc: '[DEMO] Smooth urban tarmac stretch featuring wide sidewalks, perfect for early morning tempo runs.',
      communityNotes: '“Best run right at 6:00 AM when the air is cool.”',
      videoURL: 'https://www.youtube.com/embed/placeholder',
      image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80',
      gpxCoordinates: [[9.0192, 38.7890], [9.0234, 38.7945], [9.0150, 38.7980]],
      savesCount: 89,
      completionsCount: 54
    }
  ],
  videos: [
    {
      id: 'v1',
      title: 'Entoto Mountain Ridge Walkthrough',
      area: 'Entoto Mountain',
      duration: '3:45',
      thumbnail: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80',
      embedUrl: 'https://www.youtube.com/embed/K5-GKrUrInI',
      desc: '[DEMO] Visual preview of the high-altitude eucalyptus trails and panoramic city viewpoints.'
    },
    {
      id: 'v2',
      title: 'Bole Corridor & Morning Tarmac Tour',
      area: 'Bole / Edna Mall',
      duration: '2:30',
      thumbnail: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80',
      embedUrl: 'https://www.youtube.com/embed/placeholder',
      desc: '[DEMO] Smooth sidewalks and early morning running conditions across the Bole commercial corridor.'
    }
  ],
  communities: [
    {
      id: 'c1',
      name: 'Bertusew Running Club',
      activity: 'run',
      area: 'Addis Ababa',
      schedule: 'Fri & Sun Mornings',
      description: '[DEMO] Discipline, health, and community around endurance running across Addis Ababa.',
      experienceLevels: 'All Levels',
      telegram: 'https://t.me/bertusew',
      verified: true
    }
  ],
  events: [
    {
      id: 'e1',
      title: 'Bertusew Sunday Community Run',
      activityId: 'run',
      communityId: 'c1',
      date: '2026-10-04',
      startTime: '06:30 AM',
      location: 'Entoto Park Gate',
      distance: '5K / 10K',
      description: '[DEMO] Steady conversational morning run followed by traditional Ethiopian coffee.',
      status: 'UPCOMING',
      registrationEnabled: true
    }
  ],
  challenges: [
    { id: 'ch1', title: 'First 5K Milestone', description: 'Complete your first continuous 5K run session.', target: 5, unit: 'KM', progress: 0, status: 'Active', badgeId: 'b2' }
  ],
  badges: [
    { id: 'b1', name: 'FIRST STEP', icon: '👟', desc: 'Complete your first activity.', unlocked: true },
    { id: 'b2', name: 'FIRST 5K', icon: '🏃', desc: 'Complete a 5K session.', unlocked: false }
  ],
  territories: [
    { id: 't1', name: 'Bole & Airport Zone', status: 'UNLOCKED', icon: '✈️', desc: 'Urban tarmac corridors and commercial running zones.', routesCount: 3 },
    { id: 't2', name: 'Entoto Mountain Range', status: 'LOCKED', icon: '🌲', desc: 'High-altitude eucalyptus forests and ridge trails.', routesCount: 5 },
    { id: 't3', name: 'Meskel Square & Stadium Hub', status: 'LOCKED', icon: '🏟️', desc: 'The historic heart of Ethiopian running culture.', routesCount: 2 },
    { id: 't4', name: 'Sidist Kilo & University Zone', status: 'LOCKED', icon: '🏛️', desc: 'Historic streets and campus green spaces.', routesCount: 4 }
  ],
  impactMetrics: {
    routesAvailable: 12,
    communitiesListed: 4,
    eventsScheduled: 3,
    activitiesRecorded: 145,
    statusNote: '[DEMO METRIC]'
  },
  telegramConfig: {
    botUsername: '@AddisActiveBot',
    channel: '@AddisActiveOfficial',
    group: '@AddisActiveCommunity'
  }
};
