const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { baseEmbed, COLORS } = require('../utils/embeds');

// Keep this in sync whenever a command is added or changed.
const TOPICS = {
  start: {
    title: '📖 Getting Started',
    lines: [
      'Welcome to the **TUN Gaming & War Simulator** bot.',
      '',
      '**1.** Use the pinned **Gaming Hub** panel in the games channel and pick an activity from the menu or buttons.',
      '**2.** Every button has a slash command equivalent, so you can use whichever you prefer.',
      '**3.** Use `/daily` to claim free coins, `/balance` to check them.',
      '**4.** Want to try the war simulator? Run `/sim nation create` (no Politics & War account needed).',
      '',
      'Pick a topic with `/help topic:` for details: **Games**, **War Simulator**, **Instructors**, **Admins**.',
    ],
  },
  games: {
    title: '🎮 Games & Coins',
    lines: [
      '**Hub**',
      '`/hub show` — open the Gaming Hub privately (only you see it).',
      '',
      '**Chess**',
      'Every game opens in its **own thread** so the channel stays tidy. The thread is deleted about a minute after the game ends (Rematch reuses it). Unstarted lobbies expire after 15 minutes.',
      '`/chess start` — start a game. Options: `vs_ai` (play the bot), `difficulty` (easy/medium/hard), `opponent` (invite one person), `private`.',
      'Then use the buttons on the board: **Join**, **Ready**, **Play vs AI** (host only, pick a difficulty), **Make Move**, **Resign**, **Rematch**.',
      'Moves use algebraic notation: `e4`, `Nf3`, `Qxe7`, `O-O`.',
      '`/chess move game_id move` — make a move by command instead of the button.',
      '',
      '**Minesweeper**',
      '`/minesweeper start [mines] [bet]` — a real, clickable 5x5 board. Default is 5 mines and no bet. Winning with a bet pays more the more mines you chose.',
      '',
      '**Any game**',
      '`/game join|leave|status|rematch game_id:<number>` — the game number is shown at the bottom of the game embed.',
      '',
      '**Lottery & coins**',
      '`/lottery buy [quantity]` — buy tickets. `/lottery status` — see the pool.',
      '`/daily` — claim your daily coins (or press the **Daily Coins** button on the hub). `/balance` — check your coins (or the **Balance** button).',
      'Coins are for casual games only and are completely separate from the war simulator.',
      '',
      '**Leaderboards**',
      '`/leaderboard board:<coins|war|chess>` — top 10 by coins, war simulator score, or chess wins. Also on the hub menu.',
    ],
  },
  sim: {
    title: '⚔️ War Simulator',
    lines: [
      'The simulator is a **training sandbox**. Nothing here ever changes your real Politics & War nation.',
      '',
      '**Get a nation**',
      '`/sim nation create [name]` — make a sandbox nation.',
      '`/sim link api_key` — import your real PnW nation as a starting point. Your key is never stored. Regenerate it on the PnW site afterwards.',
      '`/sim refresh api_key` — re-import from PnW. This **overwrites** your simulator values.',
      '`/sim nation view` — see your cities, resources and military.',
      'Sim Admins: `/sim nation create member:@user [name]` creates a nation for someone else, and `/sim nation view member:@user` shows theirs.',
      '',
      '**Wars**',
      '`/sim war declare target:@member [war_type]` — declare war on another member\'s simulation nation (raid / ordinary / attrition). Like chess, each war gets its own thread. A war with no attacks for 24 hours auto-expires.',
      '`/sim war view war_id` — show a war dashboard.',
      '`/sim attack launch war_id type` — ground, air, naval, missile or nuke. You can also use the buttons on the war dashboard.',
      'A war ends when one side\'s resistance hits 0 or the turns run out.',
    ],
  },
  instructor: {
    title: '🎓 Instructor Scenarios',
    lines: [
      'For Training Instructors and Simulation Administrators.',
      'A scenario copies each participant\'s nation. Your changes only touch the copy, so their normal nation is safe and comes back automatically when the scenario ends.',
      '',
      '`/sim scenario create name` — make a scenario (note its ID).',
      '`/sim scenario add scenario_id member [team]` — add a participant.',
      '`/sim scenario override scenario_id member field value` — change cities, infrastructure, money, units, or resistance.',
      '`/sim scenario override_resource scenario_id member resource amount` — change one resource.',
      '`/sim scenario start scenario_id` — begin.',
      '`/sim scenario end scenario_id` — finish and return everyone to normal.',
      '',
      'Every override is recorded in the audit log.',
      '',
      '**After-action scoring**',
      '`/sim scenario score scenario_id member overall_score [notes]` — record a score for a participant once the scenario ends.',
      '`/sim scenario scores scenario_id` — list everyone\'s recorded scores for that scenario.',
    ],
  },
  admin: {
    title: '🛡️ Administrators',
    lines: [
      '`/hub setup` — pin the Gaming Hub to the bottom of the current channel (Game Admin).',
      '`/hub remove` — remove the pinned hub.',
      '`/lottery draw` — draw the lottery winner (Game Admin).',
      '`/admin give_currency member amount` — add or remove coins (Game Admin).',
      '`/sim nation create member:@user [name]` — create a simulation nation for a member (Sim Admin).',
      '`/admin force_end_war war_id` — end a war (Sim Admin).',
      '',
      'Server Administrators can always use these. Other people need the roles configured in `.env` (`ROLE_GAME_ADMIN`, `ROLE_SIM_ADMIN`, `ROLE_TRAINING_INSTRUCTOR`). All admin actions are audit-logged.',
    ],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn what the bot can do and how to use it')
    .addStringOption((o) =>
      o
        .setName('topic')
        .setDescription('What do you want help with?')
        .addChoices(
          { name: 'Getting started', value: 'start' },
          { name: 'Games & coins', value: 'games' },
          { name: 'War simulator', value: 'sim' },
          { name: 'Instructor scenarios', value: 'instructor' },
          { name: 'Admin commands', value: 'admin' },
        )
    ),

  async execute(interaction) {
    const key = interaction.options.getString('topic') || 'start';
    const topic = TOPICS[key];

    await interaction.reply({
      embeds: [
        baseEmbed({
          title: topic.title,
          description: topic.lines.join('\n'),
          color: COLORS.primary,
          footer: 'Use /help topic:<name> to browse other sections',
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
