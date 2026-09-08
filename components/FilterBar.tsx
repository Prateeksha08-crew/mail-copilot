"use client";

import type { MailFilters } from "@/types/mail";

export function FilterBar({
  filters,
  onChange,
}: {
  filters: MailFilters;
  onChange: (f: MailFilters) => void;
}) {
  return (
    <div className="filters">
      <input
        placeholder="Sender contains..."
        value={filters.sender || ""}
        onChange={(e) => onChange({ ...filters, sender: e.target.value })}
      />
      <input
        placeholder="Keyword..."
        value={filters.keyword || ""}
        onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
      />
      <select
        value={filters.sinceDays ?? ""}
        onChange={(e) => onChange({ ...filters, sinceDays: e.target.value ? Number(e.target.value) : null })}
      >
        <option value="">Any time</option>
        <option value="1">Last day</option>
        <option value="7">Last 7 days</option>
        <option value="10">Last 10 days</option>
        <option value="30">Last 30 days</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={!!filters.unreadOnly}
          onChange={(e) => onChange({ ...filters, unreadOnly: e.target.checked })}
        />
        Unread only
      </label>
    </div>
  );
}
