# Pinoy SG Billiards Tournament Management System

## Project Overview

A Next.js-based tournament management system for billiards competitions with live streaming capabilities, player management, and real-time match tracking.

## Tech Stack

- **Framework**: Next.js 16.0.0 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Deployment**: Vercel (with GitHub integration)
- **Streaming**: OBS Studio compatible

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with navigation
│   ├── page.tsx               # Home page (redirects to tournament)
│   ├── tournament/page.tsx    # Tournament management
│   ├── players/page.tsx       # Player management (75 players)
│   ├── standby/page.tsx       # Tournament countdown timer
│   └── live-match/page.tsx    # Live match display
├── components/
│   └── Navigation.tsx         # Main navigation component
└── contexts/
    └── LiveContext.tsx        # Global live state management
```

## Key Features

### 1. Navigation System

- **Pages**: Tournament, Players, Standby, Live Match
- **Live Toggle**: Button to hide/show navigation for clean streaming
- **Context**: Global state management for live mode

### 2. Tournament Page (`/tournament`)

- **Tournament Cards**: Display tournament info with status badges
- **Create Tournament**: Modal with form fields
- **Status Colors**: Ongoing (green), Upcoming (blue), Completed (gray)
- **Features**: Name, date, participants, prize money

### 3. Players Page (`/players`)

- **75 Players Total**: 3-column layout (25 + 25 + 25)
- **Real Player Names**: 56 actual players + 19 placeholders
- **Player Data**: Name, email, phone, skill level, rating, stats
- **Add Player**: Modal with photo upload, name, ranking points
- **Color Coding**: Blue, green, purple avatars per column

### 4. Standby Page (`/standby`)

- **Tournament Title**: "PBS 10-Ball @ Klassic Club"
- **Countdown Timer**: Persistent across navigation
- **Time Selection**: Dropdown (12 PM - 8 PM, 30-min intervals)
- **Controls**: Start, Pause, Resume, Reset buttons
- **Persistence**: localStorage for timer state

### 5. Live Match Page (`/live-match`)

- **Live Toggle**: "GO LIVE" / "LIVE" button (top right)
- **Player Display**: Dave vs Joel with scores
- **Background**: Transparent for clean streaming
- **UI Elements**:
  - Red/blue gradient score container
  - Player avatars (👨👩)
  - Billiards balls 1-10 (22px font, colored circles)
  - LIVE indicator (pulsating red gradient)

## Player Roster (75 Total)

### Real Players (56):

Adrian, AJ, Aldrin, Aldwin, Alfie, AllanC, Anthony, Arys, Boj, Brandon, Clarke, Dave, Dennis, Dunn, Ebet, Ed, Erwin, Gem, Hans, Hervin, Huber, Ivan, Jarland, Joemz, Joelski, Johner, Jonas, Joey, JP, Khristian, Louie, Louie S., Marlon, Nikko, Owen, Padi, Patrick, Renz, Reymund, Richard, Robbie, Sherwin, Shierwin, Siva, Ted, Terrel, Varan, VJ, Warren, Topher, Dennel, Jerome, Emerson, Tom, Jun, Chito

### Placeholders (19):

Player 58-75

## Key Components

### LiveContext.tsx

```typescript
interface LiveContextType {
  isLive: boolean;
  setIsLive: (isLive: boolean) => void;
}
```

- Global state for live mode
- Controls navigation visibility
- Shared across all pages

### Navigation.tsx

- Conditional rendering based on live state
- Hides when `isLive` is true
- Clean streaming experience

### Live Match Features

- **Transparent Background**: Perfect for OBS streaming
- **Live Button**: Toggle between "GO LIVE" and "LIVE" states
- **Pulsating Animation**: When live mode is active
- **Player Names**: Dave vs Joel
- **Billiards Balls**: 1-10 with proper colors
- **Gradient Score Container**: Red to blue

## Styling Guidelines

- **Tailwind CSS**: Canonical class names (shrink-0, bg-linear-to-r)
- **Responsive Design**: Mobile-friendly layouts
- **Color Scheme**: Blue/red theme for competition
- **Transparent Backgrounds**: For streaming compatibility
- **Font Sizes**: 22px for billiards balls, various sizes for UI

## Deployment Setup

1. **GitHub Repository**: Connected to Vercel
2. **Automatic Deployments**: Every push to main branch
3. **Environment**: Production-ready build
4. **Domain**: Vercel provides live URL

## OBS Studio Integration

1. **Browser Source**: Add Vercel URL
2. **Interact Button**: Click to activate live mode
3. **Clean Stream**: Transparent background, no navigation
4. **Live Indicator**: Pulsating red button for status

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

## Key Files to Remember

- `src/app/live-match/page.tsx` - Main streaming page
- `src/contexts/LiveContext.tsx` - Global state
- `src/app/players/page.tsx` - Player management
- `src/app/standby/page.tsx` - Countdown timer
- `src/app/layout.tsx` - Root layout with navigation

## Replication Steps

1. Create Next.js project with TypeScript and Tailwind
2. Set up the 4 main pages (Tournament, Players, Standby, Live Match)
3. Create LiveContext for global state management
4. Implement navigation with conditional rendering
5. Add 75 players with real names and placeholder data
6. Create countdown timer with localStorage persistence
7. Build live match page with transparent background
8. Set up Vercel deployment with GitHub integration
9. Test OBS Studio integration for streaming

## Notes

- All random data generation uses deterministic methods (no Math.random in render)
- ESLint compliant with proper TypeScript types
- Mobile responsive design
- Professional streaming-ready interface
- Easy to extend with more players or features
