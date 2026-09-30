// MAGMA STUDIOS • BLOXD PVP TIER BOT
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const admin = require('firebase-admin');
const http = require('http');
const fs = require('fs');

const firebaseCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!firebaseCredentialsPath) throw new Error('Falta GOOGLE_APPLICATION_CREDENTIALS en Render.');
if (!fs.existsSync(firebaseCredentialsPath)) {
  throw new Error(`No existe el archivo de Firebase: ${firebaseCredentialsPath}`);
}

const serviceAccount = JSON.parse(fs.readFileSync(firebaseCredentialsPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const REGIONS = [
  { name: 'North America', value: 'NA' },
  { name: 'Europe', value: 'EU' },
  { name: 'Asia', value: 'AS' },
  { name: 'South America', value: 'SA' },
  { name: 'Africa', value: 'AF' },
  { name: 'Australia', value: 'AU' }
];

const TIER_CHOICES = [
  ...['HT1','HT2','HT3','HT4','HT5'].map(v => ({ name: v, value: v })),
  ...['LT1','LT2','LT3','LT4','LT5'].map(v => ({ name: v, value: v })),
  ...['T1','T2','T3','T4','T5'].map(v => ({ name: v, value: v }))
];

const MODE_NAMES = {
  sword: 'Sword',
  enchanted: 'Enchanted Sword',
  skywars: 'SkyWars',
  bedwars: 'BedWars',
  pot: 'Pot',
  hole: 'Hole',
  uhc: 'UHC',
  soup: 'Soup',
  parkour: 'Parkour'
};

const TIER_KEYS = Object.keys(MODE_NAMES);

function tierOption(name, description) {
  return option => option
    .setName(name)
    .setDescription(description)
    .addChoices(...TIER_CHOICES);
}

const updateCommand = new SlashCommandBuilder()
  .setName('tierupdate')
  .setDescription('Actualiza o registra un jugador en el leaderboard.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
  .addUserOption(option => option.setName('target').setDescription('Jugador de Discord.').setRequired(true))
  .addIntegerOption(option => option.setName('points').setDescription('Puntos Overall.').setMinValue(0).setMaxValue(100000).setRequired(true))
  .addStringOption(option => option.setName('region').setDescription('Región del jugador.').setChoices(...REGIONS).setRequired(true))
  .addStringOption(tierOption('sword', 'Tier de Sword.'))
  .addStringOption(tierOption('enchanted', 'Tier de Enchanted Sword.'))
  .addStringOption(tierOption('skywars', 'Tier de SkyWars.'))
  .addStringOption(tierOption('bedwars', 'Tier de BedWars.'))
  .addStringOption(tierOption('pot', 'Tier de Pot.'))
  .addStringOption(tierOption('hole', 'Tier de Hole.'))
  .addStringOption(tierOption('uhc', 'Tier de UHC.'))
  .addStringOption(tierOption('soup', 'Tier de Soup.'))
  .addStringOption(tierOption('parkour', 'Tier de Parkour.'));

const infoCommand = new SlashCommandBuilder()
  .setName('tierinfo')
  .setDescription('Muestra los tiers actuales de un jugador.')
  .addUserOption(option => option.setName('target').setDescription('Jugador de Discord.').setRequired(true));

const removeCommand = new SlashCommandBuilder()
  .setName('tierremove')
  .setDescription('Elimina un jugador del leaderboard.')
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
  .addUserOption(option => option.setName('target').setDescription('Jugador de Discord.').setRequired(true));

const commands = [updateCommand, infoCommand, removeCommand].map(command => command.toJSON());

function tierValue(value) {
  return value && value !== 'N/A' ? value : 'N/A';
}

function tierRoleNames() {
  return new Set(TIER_CHOICES.map(choice => choice.value.toLowerCase()));
}

async function syncTierRoles(member, tiers) {
  const validRoleNames = tierRoleNames();
  const currentTierNames = Object.values(tiers)
    .filter(value => value !== 'N/A')
    .map(value => value.toLowerCase());

  for (const role of member.roles.cache.values()) {
    if (validRoleNames.has(role.name.toLowerCase()) && !currentTierNames.includes(role.name.toLowerCase())) {
      await member.roles.remove(role).catch(error => console.error('No se pudo quitar rol:', error.message));
    }
  }

  for (const tier of currentTierNames) {
    const role = member.guild.roles.cache.find(r => r.name.toLowerCase() === tier);
    if (role) await member.roles.add(role).catch(error => console.error('No se pudo añadir rol:', error.message));
  }
}

function playerEmbed(player, user) {
  const lines = TIER_KEYS.map(key => `**${MODE_NAMES[key]}:** ${tierValue(player[key])}`).join('\n');
  return new EmbedBuilder()
    .setColor(0xff6a1a)
    .setTitle(`🔥 ${player.nombre || user.username}`)
    .setThumbnail(player.avatarUrl || user.displayAvatarURL({ extension: 'png', size: 256 }))
    .setDescription(`**Region:** ${player.region || 'N/A'}\n**Overall:** ${Number(player.puntos || 0)} points`)
    .addFields({ name: 'Tiers', value: lines })
    .setFooter({ text: 'Magma Studios • Bloxd PvP Tier List' })
    .setTimestamp();
}

client.once('ready', async () => {
  console.log(`🤖 ${client.user.tag} Is online and ready!`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ ${commands.length} slash commands registered.`);
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'tierupdate') {
    await interaction.deferReply();

    try {
      const user = interaction.options.getUser('target');
      const points = interaction.options.getInteger('points');
      const region = interaction.options.getString('region');

      const tiers = Object.fromEntries(
        TIER_KEYS.map(key => [key, tierValue(interaction.options.getString(key))])
      );

      const data = {
        nombre: user.username,
        displayName: user.globalName || user.username,
        avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
        puntos: points,
        region,
        ...tiers,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('leaderboard').doc(user.id).set(data, { merge: true });

      const member = interaction.guild
        ? await interaction.guild.members.fetch(user.id).catch(() => null)
        : null;

      if (member) await syncTierRoles(member, tiers);

      const embed = new EmbedBuilder()
        .setColor(0xff6a1a)
        .setTitle('🔥 Tier Update Complete')
        .setThumbnail(data.avatarUrl)
        .setDescription(`**${user.username}** ya está actualizado en el leaderboard.`)
        .addFields(
          { name: 'Overall', value: `${points} pts`, inline: true },
          { name: 'Region', value: region, inline: true },
          { name: 'Player', value: `<@${user.id}>`, inline: true }
        )
        .setFooter({ text: 'Magma Studios • Firebase Live' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Error en /tierupdate:', error);
      await interaction.editReply({
        content: '❌ No pude actualizar el jugador. Revisa los logs de Render y los permisos del bot.'
      });
    }
    return;
  }

  if (interaction.commandName === 'tierinfo') {
    await interaction.deferReply();
    try {
      const user = interaction.options.getUser('target');
      const snapshot = await db.collection('leaderboard').doc(user.id).get();

      if (!snapshot.exists) {
        return interaction.editReply({ content: `❌ **${user.username}** todavía no está en el leaderboard.` });
      }

      await interaction.editReply({ embeds: [playerEmbed(snapshot.data(), user)] });
    } catch (error) {
      console.error('❌ Error en /tierinfo:', error);
      await interaction.editReply({ content: '❌ No pude leer los datos del jugador.' });
    }
    return;
  }

  if (interaction.commandName === 'tierremove') {
    await interaction.deferReply();
    try {
      const user = interaction.options.getUser('target');
      const ref = db.collection('leaderboard').doc(user.id);
      const snapshot = await ref.get();

      if (!snapshot.exists) {
        return interaction.editReply({ content: `❌ **${user.username}** no está en el leaderboard.` });
      }

      await ref.delete();

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe5484d)
            .setTitle('🗑️ Player Removed')
            .setDescription(`**${user.username}** fue eliminado del leaderboard.`)
            .setFooter({ text: 'Magma Studios • Firebase' })
            .setTimestamp()
        ]
      });
    } catch (error) {
      console.error('❌ Error en /tierremove:', error);
      await interaction.editReply({ content: '❌ No pude eliminar al jugador.' });
    }
  }
});

client.on('error', error => console.error('❌ Discord client error:', error));
client.on('shardError', error => console.error('❌ Discord gateway error:', error));

function startServer() {
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Magma-Bot Is Alive!');
  }).listen(process.env.PORT || 3000, () => {
    console.log('✅ Render Port Scanner satisfied successfully!');
  });
}

startServer();

const token = process.env['DISCORD_' + 'TOKEN'];
if (!token) console.error('❌ Discord token missing in Render environment.');
else client.login(token).catch(error => console.error('❌ Discord login failed:', error));
