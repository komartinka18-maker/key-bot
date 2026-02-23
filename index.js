require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = process.env.PREFIX || '!';
const adminRoleId = process.env.ADMIN_ROLE_ID;
const paidRoleId = process.env.PAID_ROLE_ID;

// JSON key storage
let keys = {};
if (fs.existsSync('keys.json')) {
  keys = JSON.parse(fs.readFileSync('keys.json', 'utf-8'));
}

function saveKeys() {
  fs.writeFileSync('keys.json', JSON.stringify(keys, null, 2));
}

client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

// Admin commands
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (message.member.roles.cache.has(adminRoleId)) {
    if (command === 'genkey') {
      if (!args[0]) return message.reply('Usage: !genkey <uses> [days]');
      const uses = parseInt(args[0]);
      const days = args[1] ? parseInt(args[1]) : 7;

      const key = 'KMS-' + Math.random().toString(36).substr(2, 10).toUpperCase();
      keys[key] = { uses, expires: Date.now() + days * 24 * 60 * 60 * 1000 };
      saveKeys();

      message.reply({ embeds: [new EmbedBuilder()
        .setTitle('Key Generated')
        .setDescription(`Key: **${key}**\nUses: ${uses}\nExpires: <t:${Math.floor(keys[key].expires/1000)}:R>`)
        .setColor('#00ff00')] });
    }

    if (command === 'panel') {
      const embed = new EmbedBuilder()
        .setTitle('PvP Control Panel')
        .setDescription(
          "This control panel is for project: **PvP**\n" +
          "If you're a buyer, click the buttons below to:\n" +
          "redeem your key, get the script,\n" +
          "get your role, reset HWID, or view stats."
        )
        .setColor('#2f3136')
        .setFooter({ text: 'Sent by ' + message.author.tag })
        .setTimestamp();

      const row1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('redeem_key')
            .setLabel('Redeem Key')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔑'),

          new ButtonBuilder()
            .setCustomId('get_script')
            .setLabel('Get Script')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📜'),

          new ButtonBuilder()
            .setCustomId('get_role')
            .setLabel('Get Role')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👤')
        );

      const row2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('reset_hwid')
            .setLabel('Reset HWID')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚙️'),

          new ButtonBuilder()
            .setCustomId('get_stats')
            .setLabel('Get Stats')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊')
        );

      await message.channel.send({ embeds: [embed], components: [row1, row2] });
      await message.reply({ content: 'Panel sent!', ephemeral: true });
    }
  }

  if (command === 'redeem') {
    if (!args[0]) return message.reply('Usage: !redeem <key>');
    const key = args[0].toUpperCase();

    if (!keys[key]) return message.reply('Invalid key.');
    if (keys[key].expires < Date.now()) return message.reply('Key expired.');

    if (keys[key].uses <= 0) {
      delete keys[key];
      saveKeys();
      return message.reply('Key used up.');
    }

    keys[key].uses--;
    if (keys[key].uses <= 0) delete keys[key];
    saveKeys();

    if (paidRoleId) {
      try {
        await message.member.roles.add(paidRoleId);
      } catch (e) {}
    }

    const msg = 'Key redeemed!\nScript: https://pastebin.com/raw/YOUR_SCRIPT_RAW\nDo not share!';
    await message.reply({ content: msg, ephemeral: true });
    message.author.send(msg).catch(() => {});
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  let reply = 'Action done!';

  switch (interaction.customId) {
    case 'redeem_key': reply = 'Use !redeem YOURKEY in channel or DM.'; break;
    case 'get_script': 
      reply = 'Script sent to DMs.';
      await interaction.user.send('Script: https://pastebin.com/raw/YOUR_SCRIPT_RAW').catch(() => {});
      break;
    case 'get_role':
      if (paidRoleId) {
        try {
          await interaction.member.roles.add(paidRoleId);
          reply = 'Role added!';
        } catch {
          reply = 'Role add failed — ask admin.';
        }
      } else reply = 'No role set.';
      break;
    case 'reset_hwid': reply = 'HWID reset requested — DM admin.'; break;
    case 'get_stats': reply = 'Stats: Coming soon.'; break;
  }

  await interaction.reply({ content: reply, ephemeral: true });
});

client.login(process.env.TOKEN);
