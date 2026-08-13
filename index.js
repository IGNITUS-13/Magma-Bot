// Cargar librerías necesarias para el bot de MAGMA STUDIOS
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const admin = require('firebase-admin');

// 🔑 CONFIGURACIÓN DE FIREBASE (Reemplaza con tus datos de Firebase Console)
// Para el bot usamos el SDK de administración (Service Account)
const serviceAccount = {
  projectId: "bloxd-pvp-tierlist",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDt+WFdk5KDpV2b\n1pu7NPPNhgz4JgEKDx+z28drXJVhDCzRECzq0zXUFFZAx1K5+X8tOBNKvQw0goDz\nD6Vrk+kUdu6AHhqqji2LGCe4DOqkNQOjb/Fate5krrdwc3WtBriXh2GDL9bBV/xe\ne11z09/lU4pmTC7AMG9lrne9B1om9cHeZyYyaBzNyJER0TCFSUihjzAoLCgwIPWo\nZyN/pWHzBLvr59/kpHEKyNTzMd6E7JJaQcPlGiGsDEzdVXLV8b90nfuw1zstw4au\nXwyX3+eQvzYpI70wOS2FC9SJmcD24Foq7JNFO2RxwOYeAd363YRvR1ciG11UA/Oo\ncjv5ZD8pAgMBAAECggEAX3UPxdoKxOzh4j+RQ2RnwZLag/W2qALODDcGRL4kG4Qn\nPAtZgS6M4o/v01dBC2GVzp02O94eVbfdouItUDxKHA/i9phcyPp0MV3UnOLtgkXT\nuk0Oivz8bf2Zjq150BiolfvTtSxM4Ex7aqjgoTQllRdQJl27yRMEtExqMnSPCJ35\nBSPDyFoCJDwdwdfVfpKPBWuw5ckMfk8HnzQaKs9Ip0XK4Pmt/KbVuAh4L/pJBIZe\n9Fl0RAkyQraWW7wpsiSCORnrgGZUGD9k0FTBt1/B7uOL+/dgHn8xjLyuT2FHNUhb\nCY6BCuI8giCqc0EWPhtGSkcfigFPqx+3CoYCzXKaowKBgQD7HAigyPJhmxURKkXu\nE548nkweT5SsgqMpYLzbcxMza1XnmBaUe+82+dA7e3tOwDlSnKj81i/b6+FGIX4X\njmefFPmepmO0ZdF9d5oXkZQkh1EAJR472AAUw+LSa3NptoMYsKALF+2v5FGUY93A\nWGwibSGG/NKqnfSP/GKJ/ead8wKBgQDym9tteD6OJHJrhKXYnHxuAyXfLdCyVEzI\nLE3FUOTdCoKLPshetilf13c9xjKWCCR5W9n81QcBt2BExuOPH0LDGdzAOuAo7ypu\n/81OnSOsB3avM4t3cTU8LrJq0Pv1sw3aYt5iItyQcedOdLVEWzBmyg6eYzhA7U9z\nJ0MprHtJcwKBgFwfVb7+2YUbaugoNQ15nwSoIk7AbU+4gXlNpxtvJS0pBJP5RNdm\nfEUT8uPPklY6yQzYslpHjblF2RhscyDbOoKvJECi1FM7Q1afSSW6X7ni9sFx3Jyh\nyq3Ti2QczXOL5J5rNdu8BJQR1Cf3V0QYbFtY5ALsv7CeUDl+ovvy7OcnAoGAXHYb\n9aebJ68qUGHYlypkncTjXSBn5l8MeEmyRh4jaz7DK/B8iuQf9p/2mPt9cgKebAYe\nmSZTKktKDExEk9pVJmgn4rdNkSw9Xtps06Y93yVlDTa204m4wTwG0YDeVfCsuetu\nV7ZzmzVd81+1adzbIIGneqPT36LR4dA3350Vy5MCgYEAs9tg60cuORaldDB5kvcB\nXFzoyWYoIWCbpEDgBrhJJoI3H+OZV1CQ79Kbant2LRv4OwrspFIycH0bLmUUvnG6\nLc3QNT+F4PTB+HTXyFhEkuikPKG42MaWJE07mIQahoQKQWEWtui3VRfg6OH6tPr5\nr1cnTUmLN9zDHLU85ZhmfXA=\n-----END PRIVATE KEY-----\n",
.replace(/\\n/g, '\n'),
  clientEmail: "firebase-adminsdk-fbsvc@bloxd-pvp-tierlist.iam.gserviceaccount.com"
};

// Inicializar la base de datos en el Bot
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Inicializar el Bot de Discord con los permisos que activaste en la web
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

// ⚡ EVENTO: REGISTRAR COMANDOS CUANDO EL BOT SE ENCIENDA
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
    // Verificar que quien usa el comando sea un admin/tester (Puedes poner tu ID de Discord aquí)
    // if (interaction.user.id !== 'TU_ID_DE_DISCORD') return interaction.reply('❌ Only official testers can use this command.');

    const user = interaction.options.getUser('target');
    const points = interaction.options.getInteger('points');
    const region = interaction.options.getString('region');

    // Capturar la URL de su foto de perfil de Discord automáticamente
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });

    // Crear el objeto con los datos que irán a Firebase
    const datosJugador = {
      nombre: user.username,
      avatarUrl: avatarUrl,
      puntos: points,
      region: region,
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

    try {
      // Guardar o actualizar en Firebase Firestore dentro de la colección "leaderboard"
      await db.collection('leaderboard').doc(user.id).set(datosJugador, { merge: true });
      
      await interaction.reply(`👑 **${user.username}** has been successfully updated on the leaderboard! Fetching live data to the website...`);
    } catch (error) {
      console.error(error);
      await interaction.reply('❌ Database error while updating the player.');
    }
  }
});

// Encender el bot usando una variable de entorno segura para el Token
client.login(process.env.DISCORD_TOKEN);
