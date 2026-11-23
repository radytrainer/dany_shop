export type NavLink = { href: string; label: string };
export type NavGroup = { key: string; label: string; href: string; imageUrl: string | null; links: NavLink[] };

export type HeaderNav = {
  groups: NavGroup[];
  collections: NavLink[];
  showCollections: boolean;
};
