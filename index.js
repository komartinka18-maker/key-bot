require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');

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

let keys = {}; // in-memory keys (no fs to avoid Railway crash)

client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Admin only
  if (message.member.roles.cache.has(adminRoleId)) {
    if (command === 'genkey') {
      if (!args[0]) return message.reply('!genkey <uses> [days]');
      const uses = parseInt(args[0]);
      const days = args[1] ? parseInt(args[1]) : 7;

      const key = 'KMS-' + Math.random().toString(36).substr(2, 10).toUpperCase();
      keys[key] = { uses, expires: Date.now() + days * 86400000 };

      message.reply({ embeds: [new EmbedBuilder()
        .setTitle('Key Generated')
        .setDescription(`Key: **${key}**\nUses: ${uses}\nExpires: <t:${Math.floor(keys[key].expires/1000)}:R>`)
        .setColor('#00ff00')] });
    }

    if (command === 'panel') {
      const embed = new EmbedBuilder()
        .setTitle('PvP Control Panel')
        .setDescription("This panel is for **PvP** project.\nBuyers: click buttons to redeem key, get script, get role, reset HWID or view stats.")
        .setColor('#2f3136')
        .setFooter({ text: 'Sent by ' + message.author.tag })
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('redeem_key').setLabel('Redeem Key').setStyle(ButtonStyle.Success).setEmoji('🔑'),
        new ButtonBuilder().setCustomId('get_script').setLabel('Get Script').setStyle(ButtonStyle.Primary).setEmoji('📜'),
        new ButtonBuilder().setCustomId('get_role').setLabel('Get Role').setStyle(ButtonStyle.Secondary).setEmoji('👤')
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('reset_hwid').setLabel('Reset HWID').setStyle(ButtonStyle.Danger).setEmoji('⚙️'),
        new ButtonBuilder().setCustomId('get_stats').setLabel('Get Stats').setStyle(ButtonStyle.Secondary).setEmoji('📊')
      );

      await message.channel.send({ embeds: [embed], components: [row1, row2] });
      await message.reply({ content: 'Panel sent!', ephemeral: true });
    }
  }

  // Redeem command
  if (command === 'redeem') {
    if (!args[0]) return message.reply('Usage: !redeem <key>');
    const key = args[0].toUpperCase();

    if (!keys[key]) return message.reply('Invalid key.');
    if (keys[key].expires < Date.now()) return message.reply('Key expired.');

    if (keys[key].uses <= 0) {
      delete keys[key];
      return message.reply('Key used up.');
    }

    keys[key].uses--;

    if (paidRoleId) {
      try { await message.member.roles.add(paidRoleId); } catch {}
    }

    const msg = 'Redeemed!\nScript: https://pastebin.com/raw/YOUR_RAW_LINK\nDo NOT share!';
    await message.reply({ content: msg, ephemeral: true });
    message.author.send(msg).catch(() => {});
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  let msg = 'Done!';

  switch (interaction.customId) {
    case 'redeem_key': msg = 'Reply: !redeem YOURKEY'; break;
    case 'get_script':
      msg = 'Script sent to DMs.';
      await interaction.user.send('Script: https://pastebin.com/raw/YOUR_RAW_LINK').catch(() => {});
      break;
    case 'get_role':
      if (paidRoleId) {
        try { await interaction.member.roles.add(paidRoleId); msg = 'Role added!'; }
        catch { msg = 'Role failed — ask admin.'; }
      } else msg = 'No role set.';
      break;
    case 'reset_hwid': msg = 'HWID reset requested — DM admin.'; break;
    case 'get_stats': msg = 'Stats: coming soon.'; break;
  }

  await interaction.reply({ content: msg, ephemeral: true });
});

client.login(process.env.TOKEN);
