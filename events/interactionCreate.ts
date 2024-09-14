import { Events } from "discord.js";
import { bans } from "../db.ts";
import config from "../config.json" with {type: "json"};

export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		let userBanned = (await bans.get(interaction.user.id)) || false;

		if (config.banned) {
			for (let bannedRole of config.banned) {
				if (interaction.member.roles.cache.has(bannedRole)) {
					userBanned = true;
				}
			}
		}

		if (userBanned) {
			return await interaction.reply({
				content: "You are banned from the proxy dispenser.",
				ephemeral: true,
			});
		}

		if (interaction.isCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(
					`No command matching ${interaction.commandName} was found.`
				);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: "There was an error while executing this command!",
						ephemeral: true,
					});
				} else {
					await interaction.reply({
						content: "There was an error while executing this command!",
						ephemeral: true,
					});
				}
			}
		} else if (interaction.isButton()) {
			const buttonId = interaction.customId.includes("/")
				? interaction.customId.split("/")[0]
				: interaction.customId;

			const button = interaction.client.buttons.get(buttonId);

			if (!button) {
				console.error(`No button matching ${buttonId} was found.`);
				return;
			}

			try {
				await button.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: "There was an error while executing this button!",
						ephemeral: true,
					});
				} else {
					await interaction.reply({
						content: "There was an error while executing this button!",
						ephemeral: true,
					});
				}
			}
		} else if (interaction.isModalSubmit()) {
			const modalId = interaction.customId.includes("/")
				? interaction.customId.split("/")[0]
				: interaction.customId;

			const modal = interaction.client.modals.get(modalId);

			if (!modal) {
				console.error(`No modal matching ${modalId} was found.`);
				return;
			}

			try {
				await modal.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: "There was an error while executing this modal!",
						ephemeral: true,
					});
				} else {
					await interaction.reply({
						content: "There was an error while executing this modal!",
						ephemeral: true,
					});
				}
			}
		}
	},
};
