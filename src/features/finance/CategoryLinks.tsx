import React, { useRef, useState, useEffect } from 'react';
import { CATEGORIES } from '../../constants';

interface CategoryLinksProps {
  setSelectedCategory: (id: string) => void;
}

const CARD_CLASS =
  'bg-white/70 p-5 rounded-[3rem] shadow-sm border-2 border-transparent hover:bg-white hover:border-indigo-600 hover:shadow-2xl transition-all cursor-pointer group';

function Card({
  id,
  label,
  icon,
  color,
  subtitle,
  onClick,
  className = '',
}: {
  id: string;
  label: string;
  icon: string;
  color: string;
  subtitle: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div onClick={onClick} className={`${CARD_CLASS} ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div
            className={`${color} w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-white text-3xl shadow-lg group-hover:scale-110 transition-transform`}
          >
            <i className={`fa-solid ${icon}`}></i>
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">{label}</h3>
            <p className="text-indigo-600 text-xs font-black uppercase tracking-widest opacity-60">{subtitle}</p>
          </div>
        </div>
        <i className="fa-solid fa-arrow-right text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all text-2xl"></i>
      </div>
    </div>
  );
}

export const CategoryLinks: React.FC<CategoryLinksProps> = ({ setSelectedCategory }) => {
  const expenses = CATEGORIES.find(c => c.id === 'expenses')!;
  const revenues = CATEGORIES.find(c => c.id === 'revenues')!;
  const documents = CATEGORIES.find(c => c.id === 'documents')!;

  const leftCards = [
    { ...expenses, subtitle: 'View Operational Logs' as const },
    { ...revenues, subtitle: 'View Operational Logs' as const },
    { id: 'solvency', label: 'County Net Worth', icon: 'fa-chart-line', color: 'bg-blue-500', subtitle: 'View Financial Trends' as const },
  ];
  const documentsCard = { ...documents, subtitle: 'View Documents' as const };

  const leftColRef = useRef<HTMLDivElement>(null);
  const [leftColWidth, setLeftColWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = leftColRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setLeftColWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile: single column of 4 cards */}
      <div className="flex flex-col gap-6 md:hidden">
        {CATEGORIES.filter(c => ['revenues', 'expenses', 'documents'].includes(c.id)).map(cat => (
          <Card
            key={cat.id}
            id={cat.id}
            label={cat.label}
            icon={cat.icon}
            color={cat.color}
            subtitle={cat.id === 'documents' ? 'View Documents' : 'View Operational Logs'}
            onClick={() => setSelectedCategory(cat.id)}
          />
        ))}
        <Card
          id="solvency"
          label="County Net Worth"
          icon="fa-chart-line"
          color="bg-blue-500"
          subtitle="View Financial Trends"
          onClick={() => setSelectedCategory('solvency')}
        />
      </div>

      {/* Desktop: left column (Expenses, Revenues, County Net Worth), right column (Documents) */}
      <div className="hidden md:flex md:justify-between md:items-start md:gap-8">
        <div ref={leftColRef} className="flex flex-col gap-6">
          {leftCards.map(card => (
            <Card
              key={card.id}
              id={card.id}
              label={card.label}
              icon={card.icon}
              color={card.color}
              subtitle={card.subtitle}
              onClick={() => setSelectedCategory(card.id)}
            />
          ))}
        </div>
        <div className="min-w-0" style={leftColWidth != null ? { width: leftColWidth } : undefined}>
          <Card
            key={documentsCard.id}
            id={documentsCard.id}
            label={documentsCard.label}
            icon={documentsCard.icon}
            color={documentsCard.color}
            subtitle={documentsCard.subtitle}
            onClick={() => setSelectedCategory(documentsCard.id)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
