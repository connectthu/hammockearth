"use client";

interface TagFilterDropdownProps {
  tags: string[];
  selectedTag?: string;
  type?: string;
}

export function TagFilterDropdown({ tags, selectedTag, type }: TagFilterDropdownProps) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const tag = e.target.value;
    const base = type ? `/events?type=${type}` : "/events";
    const sep = type ? "&" : "?";
    window.location.href = tag ? `${base}${sep}tag=${encodeURIComponent(tag)}` : base;
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="tag-filter" className="text-xs text-charcoal/40 whitespace-nowrap">
        Filter by topic
      </label>
      <select
        id="tag-filter"
        defaultValue={selectedTag ?? ""}
        onChange={handleChange}
        className="text-sm border border-linen rounded-full px-3 py-1.5 bg-white text-charcoal/70 focus:outline-none focus:border-soil cursor-pointer"
      >
        <option value="">All topics</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>{tag}</option>
        ))}
      </select>
    </div>
  );
}
