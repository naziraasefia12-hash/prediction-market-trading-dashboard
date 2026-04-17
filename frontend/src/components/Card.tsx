import { ReactNode } from "react";
import clsx from "clsx";

type Props = {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function Card({ title, subtitle, badge, action, className, children }: Props) {
  return (
    <section className={clsx("glass-panel p-5 animate-fade-in", className)}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="section-title">{title}</p>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs leading-relaxed text-mist/55">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
