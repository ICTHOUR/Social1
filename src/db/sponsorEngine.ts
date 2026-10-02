import { Database as SqlJsDatabase } from 'sql.js';
import { getDatabase, saveDbSync, queryDbAll, queryDbOne, runDb } from './database.js';

export interface SponsorPartner {
  id: string;
  name: string;
  tagline?: string;
  logoUrl: string;
  bannerUrl?: string;
  destinationUrl: string;
  description?: string;
  tier: 'platinum' | 'gold' | 'silver' | 'partner';
  status: 'active' | 'inactive';
  displayOrder: number;
  clicksCount: number;
  impressionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export function ensureSponsorTables(db: SqlJsDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS sponsor_partners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT,
      logo_url TEXT NOT NULL,
      banner_url TEXT,
      destination_url TEXT NOT NULL,
      description TEXT,
      tier TEXT DEFAULT 'gold',
      status TEXT DEFAULT 'active',
      display_order INTEGER DEFAULT 0,
      clicks_count INTEGER DEFAULT 0,
      impressions_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default sponsor partners if empty
  const count = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM sponsor_partners');
  if (!count || count.cnt === 0) {
    const now = new Date().toISOString();
    const defaultSponsors = [
      {
        id: 'sp_google_cloud',
        name: 'Google Cloud Platform',
        tagline: 'Enterprise AI & Scalable Infrastructure',
        logo_url: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=200&q=80',
        banner_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        destination_url: 'https://cloud.google.com',
        description: 'Accelerate digital transformation with high-performance computing, Vertex AI, and global edge network.',
        tier: 'platinum',
        status: 'active',
        display_order: 1,
      },
      {
        id: 'sp_cyber_matrix',
        name: 'Liquid Visuals Studio',
        tagline: 'Hyper-Realistic 3D & WebGL Shaders',
        logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
        banner_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
        destination_url: 'https://threejs.org',
        description: 'Next-generation liquid glass rendering and spatial web applications for creative developers worldwide.',
        tier: 'gold',
        status: 'active',
        display_order: 2,
      },
      {
        id: 'sp_nixo_pay',
        name: 'Nexus PayStation',
        tagline: 'Instant Zero-Fee Digital Payments',
        logo_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=200&q=80',
        banner_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=800&q=80',
        destination_url: 'https://stripe.com',
        description: 'Empowering creator monetization with bKash, Nagad, Stripe, and crypto coin settlements.',
        tier: 'silver',
        status: 'active',
        display_order: 3,
      },
    ];

    for (const sp of defaultSponsors) {
      db.run(
        `INSERT INTO sponsor_partners (
          id, name, tagline, logo_url, banner_url, destination_url, description, tier, status, display_order, clicks_count, impressions_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
        [
          sp.id,
          sp.name,
          sp.tagline,
          sp.logo_url,
          sp.banner_url,
          sp.destination_url,
          sp.description,
          sp.tier,
          sp.status,
          sp.display_order,
          now,
          now,
        ]
      );
    }
    saveDbSync(db);
  }
}

export function getAllSponsors(db: SqlJsDatabase, onlyActive = false): SponsorPartner[] {
  let query = 'SELECT * FROM sponsor_partners';
  if (onlyActive) {
    query += " WHERE status = 'active'";
  }
  query += ' ORDER BY display_order ASC, created_at DESC';

  const rows = queryDbAll(db, query);
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    tagline: r.tagline || '',
    logoUrl: r.logo_url,
    bannerUrl: r.banner_url || '',
    destinationUrl: r.destination_url,
    description: r.description || '',
    tier: r.tier || 'gold',
    status: r.status || 'active',
    displayOrder: Number(r.display_order || 0),
    clicksCount: Number(r.clicks_count || 0),
    impressionsCount: Number(r.impressions_count || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function getSponsorById(db: SqlJsDatabase, id: string): SponsorPartner | null {
  const r = queryDbOne(db, 'SELECT * FROM sponsor_partners WHERE id = ?', [id]);
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    tagline: r.tagline || '',
    logoUrl: r.logo_url,
    bannerUrl: r.banner_url || '',
    destinationUrl: r.destination_url,
    description: r.description || '',
    tier: r.tier || 'gold',
    status: r.status || 'active',
    displayOrder: Number(r.display_order || 0),
    clicksCount: Number(r.clicks_count || 0),
    impressionsCount: Number(r.impressions_count || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function createSponsor(db: SqlJsDatabase, data: Partial<SponsorPartner>): SponsorPartner {
  const id = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO sponsor_partners (
      id, name, tagline, logo_url, banner_url, destination_url, description, tier, status, display_order, clicks_count, impressions_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [
      id,
      data.name || 'New Sponsor Partner',
      data.tagline || '',
      data.logoUrl || 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=200&q=80',
      data.bannerUrl || '',
      data.destinationUrl || 'https://example.com',
      data.description || '',
      data.tier || 'gold',
      data.status || 'active',
      Number(data.displayOrder || 0),
      now,
      now,
    ]
  );
  saveDbSync(db);
  return getSponsorById(db, id)!;
}

export function updateSponsor(db: SqlJsDatabase, id: string, data: Partial<SponsorPartner>): SponsorPartner | null {
  const existing = getSponsorById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.run(
    `UPDATE sponsor_partners SET
      name = ?,
      tagline = ?,
      logo_url = ?,
      banner_url = ?,
      destination_url = ?,
      description = ?,
      tier = ?,
      status = ?,
      display_order = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      data.name !== undefined ? data.name : (existing.name || ''),
      data.tagline !== undefined ? (data.tagline || '') : (existing.tagline || ''),
      data.logoUrl !== undefined ? data.logoUrl : (existing.logoUrl || ''),
      data.bannerUrl !== undefined ? (data.bannerUrl || '') : (existing.bannerUrl || ''),
      data.destinationUrl !== undefined ? data.destinationUrl : (existing.destinationUrl || ''),
      data.description !== undefined ? (data.description || '') : (existing.description || ''),
      data.tier !== undefined ? data.tier : (existing.tier || 'gold'),
      data.status !== undefined ? data.status : (existing.status || 'active'),
      data.displayOrder !== undefined ? Number(data.displayOrder) : Number(existing.displayOrder || 0),
      now,
      id,
    ]
  );
  saveDbSync(db);
  return getSponsorById(db, id);
}

export function deleteSponsor(db: SqlJsDatabase, id: string): boolean {
  db.run('DELETE FROM sponsor_partners WHERE id = ?', [id]);
  saveDbSync(db);
  return true;
}

export function recordSponsorClick(db: SqlJsDatabase, id: string) {
  db.run('UPDATE sponsor_partners SET clicks_count = clicks_count + 1 WHERE id = ?', [id]);
  saveDbSync(db);
}

export function recordSponsorImpression(db: SqlJsDatabase, id: string) {
  db.run('UPDATE sponsor_partners SET impressions_count = impressions_count + 1 WHERE id = ?', [id]);
  saveDbSync(db);
}
