import { QUESTS, countsTowardQuestCape, TOTAL_CAPE_QUESTS, TOTAL_CAPE_QP } from '../constants/quest-data.ts';

console.log('Total entries:', QUESTS.length);
console.log('Cape quests:', TOTAL_CAPE_QUESTS, '(expected 180)');
console.log('QP cape quests:', TOTAL_CAPE_QP, '(expected 335)');
console.log('Miniquests + RFD subs:', QUESTS.length - TOTAL_CAPE_QUESTS);
