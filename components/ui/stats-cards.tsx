interface StatsProps {
  totalStations: number;
  totalCities?: number;
  totalStates?: number;
  totalOperators?: number;
  fastChargers?: number;
  className?: string;
}

export function StatsCards({
  totalStations,
  totalCities,
  totalStates,
  totalOperators,
  fastChargers,
  className = "",
}: StatsProps) {
  const stats = [
    {
      label: "Charging Stations",
      value: totalStations.toLocaleString("en-IN"),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 10V3L4 14h7v7l9-11h-7Z"
        />
      ),
      highlight: true,
    },
    ...(totalCities !== undefined
      ? [
          {
            label: "Cities Covered",
            value: totalCities.toLocaleString("en-IN"),
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"
              />
            ),
          },
        ]
      : []),
    ...(totalStates !== undefined
      ? [
          {
            label: "States & UTs",
            value: totalStates.toLocaleString("en-IN"),
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            ),
          },
        ]
      : []),
    ...(totalOperators !== undefined
      ? [
          {
            label: "Charging Networks",
            value: totalOperators.toLocaleString("en-IN"),
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
              />
            ),
          },
        ]
      : []),
    ...(fastChargers !== undefined
      ? [
          {
            label: "Fast DC Chargers",
            value: fastChargers.toLocaleString("en-IN"),
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-[var(--color-primary)]/40 hover:-translate-y-0.5 hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--color-muted)]">{stat.label}</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-primary)] transition-transform duration-200 group-hover:scale-110">
              <svg
                className="w-4 h-4 text-[var(--color-primary)] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {stat.icon}
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-dark-green)] group-hover:text-[var(--color-secondary-green)] transition-colors">
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
