export const TYPES = { FACTION:'Faction', BADGE:'Badge', TICKET:'Ticket', LIFE:'LifeEvent', ECONOMY:'Economy', ATTORNEY:'Attorney' };
export const RANK  = { [TYPES.ATTORNEY]:4, [TYPES.BADGE]:3, [TYPES.FACTION]:2, [TYPES.TICKET]:1 };
export const BADGE_TRUMP_NAMES = new Set(['Jail Time','Blockade Order','Blacklist Notice']);
export const BATTLE_TYPES = new Set([TYPES.ATTORNEY, TYPES.BADGE, TYPES.FACTION, TYPES.TICKET]);
