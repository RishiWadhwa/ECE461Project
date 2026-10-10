// MOCK DATABASE — NOT A FINAL MODULE. Dev/demo only, so the frontend can run before the
// Flask + MongoDB backend is ready. Delete once the real API is wired in.
// Every table is an in-memory hash table (Map) keyed by its ID; data resets on dev-server restart.
// Seeded logins: testuser / test1234, alice / alice1234, bob / bob12345.

export interface Project { projectID: string; name: string; description: string }
export interface HardwareSet { name: string; capacity: number; available: number }

export interface MockDB {
  /** userID -> password (the real backend stores a bcrypt hash, never the plaintext) */
  users: Map<string, string>
  /** projectID -> project */
  projects: Map<string, Project>
  /** userID -> projectIDs the user belongs to */
  memberships: Map<string, Set<string>>
  /** hwSet name -> capacity / availability */
  hardware: Map<string, HardwareSet>
  /** projectID -> (hwSet name -> units that project has checked out) */
  holdings: Map<string, Map<string, number>>
}

/** Builds a fresh, seeded copy of the mock database. Tests call this to start from a known state. */
export function createSeededDB(): MockDB {
  return {
    users: new Map([
      ['testuser', 'test1234'],
      ['alice', 'alice1234'],
      ['bob', 'bob12345'],
    ]),
    projects: new Map([
      ['demoproj1', { projectID: 'demoproj1', name: 'Demo Project', description: 'Seeded sample project' }],
      ['rflabproj', { projectID: 'rflabproj', name: 'RF Lab', description: 'Software-defined radio experiments' }],
      ['edgeproj42', { projectID: 'edgeproj42', name: 'Edge Compute', description: 'Shared project for alice and bob' }],
    ]),
    memberships: new Map([
      ['testuser', new Set(['demoproj1', 'rflabproj'])],
      ['alice', new Set(['edgeproj42'])],
      ['bob', new Set(['edgeproj42', 'rflabproj'])],
    ]),
    hardware: new Map([
      ['HWSet1', { name: 'HWSet1', capacity: 100, available: 70 }],
      ['HWSet2', { name: 'HWSet2', capacity: 100, available: 85 }],
    ]),
    // Must agree with hardware.available: HWSet1 100 - (20 + 10) = 70, HWSet2 100 - 15 = 85.
    holdings: new Map([
      ['demoproj1', new Map([['HWSet1', 20]])],
      ['rflabproj', new Map([['HWSet1', 10], ['HWSet2', 15]])],
    ]),
  }
}
