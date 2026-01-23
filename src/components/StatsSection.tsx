"use client";

import { useEffect, useState, useRef } from "react";

const stats = [
  {
    icon: (
      <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    value: "1.9M",
    label: "Documents edited",
    suffix: "+",
  },
  {
    icon: (
      <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    value: "15+",
    label: "Powerful Tools",
    suffix: "",
  },
  {
    icon: (
      <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
    value: "232K",
    label: "Documents signed",
    suffix: "+",
  },
];

export default function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-10 md:gap-16 lg:gap-28">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`flex items-center gap-5 transition-all duration-700 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="w-16 h-16 rounded-2xl bg-[color:var(--brand-lilac)] flex items-center justify-center shadow-sm">
                {stat.icon}
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-[color:var(--brand-ink)] flex items-baseline gap-1">
                  <span className={isVisible ? "stat-number" : ""}>{stat.value}</span>
                  {stat.suffix && (
                    <span className="text-secondary text-2xl font-bold">{stat.suffix}</span>
                  )}
                </div>
                <div className="text-base text-[color:var(--brand-muted)] font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
