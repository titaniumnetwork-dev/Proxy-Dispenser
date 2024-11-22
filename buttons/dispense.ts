import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ColorResolvable,
} from "discord.js";
import { users, requested, links } from "../db.ts";
import config from "../config.json" with {type: "json"};

export default {
  name: "dispense",
  async execute(interaction) {
    const maxLinksList = [config.limit];
    if (config.bonus) {
      for (let bonus of config.bonus) {
        if (interaction.member.roles.cache.has(bonus.roleID)) {
          maxLinksList.push(bonus.limit);
        }
      }
    }
    const maxLinks = Math.max.apply(null, maxLinksList);

    const serviceName = interaction.customId.split(this.name + "/")[1];
    const service = config.services.find(
      (service) => service.name === serviceName
    );

    if (!service) {
      await interaction.reply({
        content: "The requested service ${serviceName} does not exist.",
        ephemeral: true,
      });
    }

    let user = await users.get(interaction.user.id);

    if (!user) {
      user = await users.set(interaction.user.id, {
        used: 0,
      });
    }

    if (user.used >= maxLinks) {
      return await interaction.reply({
        content: "You have reached your maximum proxy limit for this month!",
        ephemeral: true,
      });
    }

    let serviceLinks = (await links.get(service.name)) || [];
    let userRequested = await requested.get(interaction.user.id);

    if (userRequested) {
      if (userRequested[service.name]) {
        serviceLinks = serviceLinks.filter(
          (item) => !userRequested[service.name].includes(item)
        );
      } else {
        userRequested = await requested.set(interaction.user.id, {
          ...userRequested,
          [service.name]: [],
        });
      }
    } else {
      userRequested = await requested.set(interaction.user.id, {
        [service.name]: [],
      });
    }

    if (!serviceLinks.length) {
      return interaction.reply({
        content: "No links are available at this time.",
        ephemeral: true,
      });
    }


    let randomLink = new URL(serviceLinks[Math.floor(Math.random() * serviceLinks.length)]);

    if (service.masqr) {
      if (process.env.PSK) {
          randomLink.username = "u";

          const license_response = await (await fetch(config.masqrURL + "/newLicense?host=" + randomLink.host, {
            headers: [
              ["psk", process.env.PSK]
            ]
          })).json();

          if (license_response["assignedLicense"] != undefined) {
            randomLink.password = license_response["assignedLicense"];
          } else {
            return interaction.reply({
              content: "The Masqr licensing server did not provide a license. Please ask the Dispenser hosts to double check their PSK and server status of the licensing server.",
              ephemeral: true,
            });
          }

      } else {
        return interaction.reply({
          content: "The Masqr enviornment variable is not set, but the link you requested is protected by Masqr. Please contact the Dispenser hosts.",
          ephemeral: true,
        });
      }
    }

    userRequested[service.name].push(randomLink.href);
    await requested.set(interaction.user.id, {
      ...userRequested,
    });

    user = await users.set(interaction.user.id, {
      ...user,
      used: user.used + 1,
    });

    const embed = new EmbedBuilder()
      .setColor(config.theme as ColorResolvable)
      .setTitle("Proxy Delivery")
      .setDescription("Enjoy your brand new proxy link!")
      .addFields(
        { name: "Type", value: serviceName },
        // enclose Masqr'd URLs in backticks, or they won't show up with the username/password
        { name: "Link", value: service.masqr ? "`" + randomLink.href + "`" : randomLink.href },
        { name: "Remaining", value: String(maxLinks - user.used) }
      );
    const row = new ActionRowBuilder();

    const link = new ButtonBuilder()
      .setLabel("Open")
      .setStyle(ButtonStyle.Link)
      .setURL(randomLink.href);

    row.addComponents(link);

    if (user.used < maxLinks && serviceLinks.length > 1) {
      const requestAnother = new ButtonBuilder()
        .setLabel("Request Another")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(interaction.customId);

      row.addComponents(requestAnother);
    }

    if (config.reportsID) {
      const report = new ButtonBuilder()
        .setCustomId("report")
        .setStyle(ButtonStyle.Danger)
        .setLabel("Report");

      row.addComponents(report);
    }

    // reporter start
    if (config.logsID) {
      const logembed = new EmbedBuilder()
        .setColor(config.theme as ColorResolvable)
        .setTitle("Proxy Log")
        .setDescription("A user has requested a link.")
        .addFields(
          { name: "Type", value: service.emoji ? "<:" + interaction.client.emojis.cache.get(service.emoji).name + ":" + service.emoji + ">  " + serviceName : serviceName},
          { name: "Link", value: service.masqr ? "`" + randomLink.href + "`" : randomLink.href },
          { name: "User", value: `<@${interaction.user.id}>` },
          { name: "Remaining Links", value: String(maxLinks - user.used)}
        );

      interaction.client.channels.cache.get(config.logsID).send({
        embeds: [logembed],
        components: [],
        ephemeral: false,
      });
    }


    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  },
};
