"use client";

const TEAMS: Array<{
  name: string;
  a: string[];
  bPlus: string[];
  b: string[];
}> = [
  {
    name: "Team CuePals",
    a: ["EJ"],
    bPlus: ["Peng"],
    b: ["Carl", "Jed", "TomAngelo"],
  },
  {
    name: "Team PBB",
    a: ["Ted"],
    bPlus: [],
    b: ["Ed", "Marlon", "Allen", "Eric"],
  },
  {
    name: "Team Pakto",
    a: ["NelsonG"],
    bPlus: ["Tom"],
    b: ["Aldwin", "Joelski", "Hans"],
  },
  {
    name: "Team WBB",
    a: ["Jason"],
    bPlus: ["Reymund", "VJ"],
    b: ["Jerome", "Dave"],
  },
  {
    name: "Team HUDAS",
    a: ["Kelvin"],
    bPlus: ["Bernard", "Nikko"],
    b: ["Emerson", "TJ"],
  },
  {
    name: "Team Tubero",
    a: ["Ivan"],
    bPlus: ["Jose", "Owen"],
    b: ["Denel", "Mario"],
  },
];

function RatingPill({ rating }: { rating: "A" | "B+" | "B" }) {
  const cls =
    rating === "A"
      ? "bg-emerald-900/60 border-emerald-400/40"
      : rating === "B+"
      ? "bg-indigo-900/60 border-indigo-300/40"
      : "bg-sky-900/60 border-sky-300/40";
  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full border text-white/95 font-bold text-[16px] leading-none whitespace-nowrap ${cls}`}
    >
      {rating}
    </span>
  );
}

function TeamCard({
  team,
}: {
  team: (typeof TEAMS)[number];
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-6 py-2">
      <div className="text-center font-bold text-white text-[26px] mb-2">
        {team.name}
      </div>
      <div className="space-y-1.5">
        {team.a.map((n) => (
          <div
            key={`a-${n}`}
            className="flex items-center justify-between gap-2"
          >
            <span className="text-white/90 font-semibold text-[24px] leading-none">
              {n}
            </span>
            <RatingPill rating="A" />
          </div>
        ))}
        {team.bPlus.map((n) => (
          <div
            key={`bp-${n}`}
            className="flex items-center justify-between gap-2"
          >
            <span className="text-white/90 font-semibold text-[24px] leading-none">
              {n}
            </span>
            <RatingPill rating="B+" />
          </div>
        ))}
        {team.b.map((n) => (
          <div
            key={`b-${n}`}
            className="flex items-center justify-between gap-2"
          >
            <span className="text-white/90 font-semibold text-[24px] leading-none">
              {n}
            </span>
            <RatingPill rating="B" />
          </div>
        ))}
        {/* Fill to exactly 5 rows if a team is missing B+ etc. */}
        {(() => {
          const count = team.a.length + team.bPlus.length + team.b.length;
          if (count >= 5) return null;
          const missing = 5 - count;
          return Array.from({ length: missing }).map((_, idx) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`empty-${idx}`}
              className="flex items-center justify-between gap-2 opacity-30"
            >
                  <span className="text-white font-semibold text-[24px] leading-none">
                —
              </span>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full border border-white/15 text-white/70 font-bold text-[16px] leading-none">
                —
              </span>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

export default function PbsCupTeamsOverlay() {
  return (
    <div className="min-h-[90vh] w-full bg-black/60 flex items-center justify-center px-2 py-6">
      <div className="w-full max-w-6xl">
        <div className="flex items-center justify-center mb-6">
          <h2 className="text-[39px] font-bold text-white drop-shadow-[0_2px_2px_rgba(255,255,255,0.35)]">
            PBS Cup March 2026
          </h2>
        </div>

        {/* 3 columns x 2 rows */}
        <div className="grid grid-cols-3 gap-x-16 gap-y-16 items-start justify-items-stretch">
          {TEAMS.map((t) => (
            <TeamCard key={t.name} team={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

