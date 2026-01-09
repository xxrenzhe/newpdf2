"use client";

const stats = [
  {
    icon: (
      <svg className="w-6 h-6 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    value: "1.9 Million",
    label: "Documents edited",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    value: "50+ Tools",
    label: "Editing Essentials",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#2d85de]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
    value: "232k",
    label: "Documents signed",
  },
];

export default function StatsSection() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 lg:gap-24">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                {stat.icon}
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
