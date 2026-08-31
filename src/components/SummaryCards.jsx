import React from 'react';
import { UserPlus, IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const SummaryCards = ({ stats }) => {
  const cards = [
    {
      id: 'today-entries',
      title: "Today's Total Entries",
      value: stats.todaysEntries,
      subtext: "New service applications registered today",
      icon: UserPlus,
      colorClass: "card-blue",
      badgeText: "Today"
    },
    {
      id: 'today-collection',
      title: "Today's Total Collection",
      value: formatCurrency(stats.todaysCollection),
      subtext: "Total cash/UPI payments received today",
      icon: IndianRupee,
      colorClass: "card-green",
      badgeText: "Collected Today"
    },
    {
      id: 'pending-balance',
      title: "Total Pending Balance",
      value: formatCurrency(stats.totalPendingBalance),
      subtext: "Outstanding balance from unpaid/partial records",
      icon: AlertCircle,
      colorClass: stats.totalPendingBalance > 0 ? "card-amber" : "card-slate",
      badgeText: stats.totalPendingBalance > 0 ? "Requires Attention" : "Clear"
    },
    {
      id: 'completed-services',
      title: "Completed Services",
      value: stats.completedServices,
      subtext: "Total service requests delivered successfully",
      icon: CheckCircle2,
      colorClass: "card-indigo",
      badgeText: "Done"
    }
  ];

  return (
    <div className="summary-cards-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} className={`summary-card ${card.colorClass}`}>
            <div className="card-accent-strip" />
            <div className="card-top">
              <span className="card-title">{card.title}</span>
              <div className="card-icon-container">
                <Icon className="card-icon" />
              </div>
            </div>
            <div className="card-value-container">
              <span className="card-value">{card.value}</span>
              <span className="card-badge">{card.badgeText}</span>
            </div>
            <p className="card-subtext">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;
