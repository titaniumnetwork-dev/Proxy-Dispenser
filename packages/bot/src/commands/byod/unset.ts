/**
 * @fileoverview A slash command to remove a BYOD host.
 */

import {
	type CommandContext,
	Declare,
	Options,
	SubCommand,
	createStringOption,
} from "seyfert";
import { t } from "try";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/info-embeds";

const options = {
	host: createStringOption({
		description: "The BYOD host to unset",
		required: true,
		autocomplete: async (interaction) => {
			try {
				const response = await fetch(
					`http://${process.env.API_IP}:${process.env.API_PORT || 3000}/hosts`,
					{
						method: "GET",
						headers: {
							"x-api-key": process.env.API_KEY!,
							"Content-Type": "application/json",
						},
					}
				);

				if (!response.ok) {
					console.error("Error fetching hosts:", response.statusText);
					return interaction.respond([]);
				}

				const data = (await response.json()) as {
					hosts: Array<{ service: string; hostname: string }>;
				};
				const hosts = Array.isArray(data) ? data : data.hosts || [];

				const filtered = hosts.filter((host) => {
					const name = host.hostname.toLowerCase();
					const service = host.service.toLowerCase();
					const input = interaction.getInput().toLowerCase();
					return name.includes(input) || service.includes(input);
				});

				const choices = filtered.slice(0, 25).map((host) => ({
					name: `(${host.service})        ${" ".repeat(30 - host.service.length)}https://${host.hostname}`,
					value: host.hostname,
				}));

				return interaction.respond(choices);
			} catch (error) {
				console.error("Error fetching hosts:", error);
				return interaction.respond([]);
			}
		},
	}),
};

@Declare({
	name: "unset",
	description: "Unset a BYOD host",
	integrationTypes: ["GuildInstall", "UserInstall"],
	contexts: ["Guild", "BotDM", "PrivateChannel"],
})
@Options(options)
export class UnsetCommand extends SubCommand {
	async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		// We need to yield some time for fetching from the BYOD API
		await ctx.deferReply();

		const host = ctx.options.host;

		const [, error, response] = await t(
			fetch(
				`http://${process.env.API_IP}:${process.env.API_PORT || 3000}/hosts/${host}`,
				{
					method: "DELETE",
					headers: {
						"x-api-key": process.env.API_KEY || "your-api-key-here",
						"Content-Type": "application/json",
					},
				},
			),
		);

		if (error || !response) {
			ctx.client.logger.error(`Failed to unset BYOD host: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("unset BYOD host")],
			});
			return;
		}

		await ctx.editOrReply({
			content: `Unset BYOD host: ${host}`,
		});
	}
}
