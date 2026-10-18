type Metric = { label: string; value: number | string; detail?: string };

export function DashboardMetrics({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="admin-metrics" aria-label="Owner project metrics">
      {metrics.map((metric) => (
        <article className="admin-metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          {metric.detail && <small>{metric.detail}</small>}
        </article>
      ))}
    </section>
  );
}
