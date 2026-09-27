const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

// Central place for "who is allowed to do sensitive things" (spec section 19).
// Every sensitive command/button MUST go through one of these checks —
// never inline a role check somewhere else.

function memberHasRole(member, roleId) {
  if (!roleId) return false;
  return member.roles.cache.has(roleId);
}

function isServerAdministrator(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

function isGameAdmin(member) {
  return isServerAdministrator(member) || memberHasRole(member, config.roles.gameAdmin);
}

function isSimAdmin(member) {
  return isServerAdministrator(member) || memberHasRole(member, config.roles.simAdmin);
}

function isTrainingInstructor(member) {
  return (
    isServerAdministrator(member) ||
    memberHasRole(member, config.roles.trainingInstructor) ||
    isSimAdmin(member)
  );
}

function isTournamentManager(member) {
  return isServerAdministrator(member) || memberHasRole(member, config.roles.tournamentManager);
}

function isModerator(member) {
  return (
    isServerAdministrator(member) ||
    memberHasRole(member, config.roles.moderator) ||
    isGameAdmin(member)
  );
}

/** Throws-free guard: returns true/false and never assumes ownership. */
function ownsResource(userId, resourceOwnerId) {
  return String(userId) === String(resourceOwnerId);
}

module.exports = {
  isServerAdministrator,
  isGameAdmin,
  isSimAdmin,
  isTrainingInstructor,
  isTournamentManager,
  isModerator,
  ownsResource,
};
