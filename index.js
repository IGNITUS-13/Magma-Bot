// Cargar librerías necesarias para el bot de MAGMA STUDIOS
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const admin = require('firebase-admin');
const http = require('http');

// 🔑 CONFIGURACIÓN DE FIREBASE CORREGIDA
// 🔐 Firebase: las credenciales se cargan desde un archivo secreto de Render.
// NO guardes el JSON de la cuenta de servicio en GitHub.
const fs = require('fs');
const firebaseCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!firebaseCredentialsPath) {
  throw new Error('Falta la variable GOOGLE_APPLICATION_CREDENTIALS en el entorno.');
}

if (!fs.existsSync(firebaseCredentialsPath)) {
  throw new Error(`No existe el archivo de credenciales de Firebase: ${firebaseCredentialsPath}`);
}

const serviceAccount = JSON.parse(fs.readFileSync(firebaseCredentialsPath, 'utf8'));

// Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Inicializar Bot de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

// 🚀 CREACIÓN DEL COMANDO SLASH (/tierupdate)
const commands = [
  new SlashCommandBuilder()
    .setName('tierupdate')
    .setDescription('Update or register a player on the Magma Studios Leaderboard')
    .addUserOption(option => 
      option.setName('target').setDescription('Select the Discord user').setRequired(true))
    .addIntegerOption(option => 
      option.setName('points').setDescription('Total Overall points').setRequired(true))
    .addStringOption(option => 
      option.setName('region').setDescription('Player Region').setRequired(true)
        .addChoices(
          { name: 'NA', value: 'NA' }, { name: 'EU', value: 'EU' }, { name: 'AS', value: 'AS' },
          { name: 'SA', value: 'SA' }, { name: 'AF', value: 'AF' }, { name: 'AU', value: 'AU' }
        ))
    .addStringOption(option => option.setName('sword').setDescription('Tier for Sword (PvP)'))
    .addStringOption(option => option.setName('enchanted').setDescription('Tier for Enchanted Sword'))
    .addStringOption(option => option.setName('skywars').setDescription('Tier for Skywars'))
    .addStringOption(option => option.setName('bedwars').setDescription('Tier for Bedwars'))
    .addStringOption(option => option.setName('pot').setDescription('Tier for Pot'))
    .addStringOption(option => option.setName('hole').setDescription('Tier for Hole'))
    .addStringOption(option => option.setName('uhc').setDescription('Tier for UHC'))
    .addStringOption(option => option.setName('soup').setDescription('Tier for Soup'))
    .addStringOption(option => option.setName('parkour').setDescription('Tier for Parkour'))
].map(command => command.toJSON());

// ⚡ EVENTO READY
client.once('ready', async () => {
  console.log(`🤖 ${client.user.tag} Is online and ready to hunt bots!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('🔄 Registering global slash commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error(error);
  }
});

// 🎮 LOGICA DEL COMANDO /tierupdate
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'tierupdate') {
    await interaction.deferReply();

    const user = interaction.options.getUser('target');
    const points = interaction.options.getInteger('points');
    const region = interaction.options.getString('region');

    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });

    const tiers = {
      sword: interaction.options.getString('sword') || 'N/A',
      enchanted: interaction.options.getString('enchanted') || 'N/A',
      skywars: interaction.options.getString('skywars') || 'N/A',
      bedwars: interaction.options.getString('bedwars') || 'N/A',
      pot: interaction.options.getString('pot') || 'N/A',
      hole: interaction.options.getString('hole') || 'N/A',
      uhc: interaction.options.getString('uhc') || 'N/A',
      soup: interaction.options.getString('soup') || 'N/A',
      parkour: interaction.options.getString('parkour') || 'N/A'
    };

    const datosJugador = {
      nombre: user.username,
      avatarUrl: avatarUrl,
      puntos: points,
      region: region,
      ...tiers
    };

    try {
      await db.collection('leaderboard').doc(user.id).set(datosJugador, { merge: true });

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      let rolesAsignadosInfo = "";

      if (member) {
        const listaTiers = Object.values(tiers).filter(t => t !== 'N/A');
        for (const tierNombre of listaTiers) {
          const rolEncontrado = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === tierNombre.toLowerCase());
          if (rolEncontrado) {
            await member.roles.add(rolEncontrado).catch(console.error);
            rolesAsignadosInfo += `\n✅ Rol añadido: **${rolEncontrado.name}**`;
          }
        }
      }

      await interaction.editReply({
        content: `👑 **${user.username}** ha sido actualizado correctamente en la base de datos de Firebase! En unos segundos se verá reflejado en la web.${rolesAsignadosInfo}`
      });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Error de base de datos o de permisos al actualizar al jugador.' });
    }
  }
});

// 🌐 INICIAR AMBOS SERVICIOS EN PARALELO (Solución definitiva para Render)
function startServer() {
  http.createServer((req, res) => {
    res.write("Magma-Bot Is Alive!");
    res.end();
  }).listen(process.env.PORT || 3000, () => {
    console.log('✅ Render Port Scanner satisfied successfully!');
  });
}

// Arrancar el truco web y el bot al mismo milisegundo
startServer();
client.login(process.env.DISCORD_TOKEN);
