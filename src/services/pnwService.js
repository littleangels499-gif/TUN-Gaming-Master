/**
 * Politics & War API Service
 * ───────────────────────────
 * Talks to the real PnW GraphQL API ONLY to:
 *   1. Verify which real nation a Discord member owns (via their API key).
 *   2. Read (never write) nation data to seed/refresh a simulation nation.
 *
 * The bot NEVER sends mutations to PnW and NEVER stores the member's API
 * key — it is used once per call and discarded. This guarantees the
 * simulator cannot accidentally touch real PnW state (spec sections 8 & 22).
 */

const config = require('../config');
const logger = require('../utils/logger');

const ME_QUERY = `
  query {
    me {
      nation {
        id
        nation_name
        leader_name
        cities { id name infrastructure land }
        num_cities
        money
        food
        coal
        oil
        uranium
        lead
        iron
        bauxite
        gasoline
        munitions
        steel
        aluminum
        soldiers
        tanks
        aircraft
        ships
        missiles
        nukes
        score
      }
    }
  }
`;

/**
 * Verifies ownership and fetches the nation snapshot in one call.
 * @param {string} apiKey - the member's own PnW API key (never persisted)
 * @returns {Promise<object>} normalized nation data
 * @throws if the key is invalid or the request fails
 */
async function fetchOwnNation(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
    throw new Error('That does not look like a valid Politics & War API key.');
  }

  const url = `${config.pnw.apiBase}?api_key=${encodeURIComponent(apiKey)}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: ME_QUERY }),
    });
  } catch (err) {
    logger.error('PnW API request failed:', err.message);
    throw new Error('Could not reach the Politics & War API. Please try again shortly.');
  }

  if (!response.ok) {
    throw new Error(`Politics & War API returned HTTP ${response.status}. Check your API key.`);
  }

  const json = await response.json();

  if (json.errors && json.errors.length) {
    throw new Error(json.errors[0].message || 'Politics & War API rejected the request.');
  }

  const nation = json?.data?.me?.nation;
  if (!nation) {
    throw new Error('No nation is associated with that API key.');
  }

  return normalizeNation(nation);
}

function normalizeNation(raw) {
  return {
    pnwNationId: String(raw.id),
    nationName: raw.nation_name,
    leaderName: raw.leader_name,
    cities: raw.num_cities ?? (raw.cities ? raw.cities.length : 1),
    infrastructureTotal: (raw.cities || []).reduce((sum, c) => sum + (c.infrastructure || 0), 0),
    treasury: raw.money ?? 0,
    resources: {
      food: raw.food ?? 0,
      coal: raw.coal ?? 0,
      oil: raw.oil ?? 0,
      uranium: raw.uranium ?? 0,
      lead: raw.lead ?? 0,
      iron: raw.iron ?? 0,
      bauxite: raw.bauxite ?? 0,
      gasoline: raw.gasoline ?? 0,
      munitions: raw.munitions ?? 0,
      steel: raw.steel ?? 0,
      aluminum: raw.aluminum ?? 0,
    },
    soldiers: raw.soldiers ?? 0,
    tanks: raw.tanks ?? 0,
    aircraft: raw.aircraft ?? 0,
    ships: raw.ships ?? 0,
    missiles: raw.missiles ?? 0,
    nukes: raw.nukes ?? 0,
    score: raw.score ?? 0,
    cityDetails: (raw.cities || []).map((c) => ({
      name: c.name,
      infrastructure: c.infrastructure,
      land: c.land,
    })),
  };
}

module.exports = { fetchOwnNation };
