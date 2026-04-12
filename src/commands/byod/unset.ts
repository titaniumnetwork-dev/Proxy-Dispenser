/**
 * @fileoverview A slash command to unset a BYOD host.
 */

import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	host: createStringOption({
		description: "The BYOD host to unset",
		required: true,
		autocomplete: async (interaction) => {
			try {
				const response = await fetch(
					`http://${process.env.BYOD_API_IP}:${process.env.BYOD_API_PORT || 3000}/hosts`,
					{
						method: "GET",
						headers: {
							"x-api-key": process.env.BYOD_API_KEY || "your-api-key-here",
							"Content-Type": "application/json",
						},
					},
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
					name: `(${host.service})${" ".repeat(Math.max(0, 30 - host.service.length))}https://${host.hostname}`.slice(
						0,
						100,
					),
					value: host.hostname.slice(0, 100),
				}));

				return interaction.respond(choices);
			} catch (error) {
				console.error("Error fetching hosts:", error);
				return interaction.respond([]);
			}
		},
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "unset",
	description: "Unset a BYOD host",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export class UnsetCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const ephemeral = ctx.options.ephemeral ?? true;
		await ctx.deferReply(ephemeral);
		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;

		const host = ctx.options.host;

		const [ok, error, response] = await t(
			fetch(
				`http://${process.env.BYOD_API_IP}:${process.env.BYOD_API_PORT || 3000}/hosts/${encodeURIComponent(host)}`,
				{
					method: "DELETE",
					headers: {
						"x-api-key": process.env.BYOD_API_KEY || "your-api-key-here",
						"Content-Type": "application/json",
					},
				},
			),
		);
		if (!ok) {
			ctx.client.logger.error(`Failed to unset BYOD host: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("unset BYOD host")],
				flags,
			});
			return;
		}

		if (!response.ok) {
			ctx.client.logger.error(
				`BYOD API returned ${response.status} when unsetting host: ${host}`,
			);
			await ctx.editOrReply({
				content: `Failed to unset BYOD host: ${host} (API returned ${response.status})`,
				flags,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Unset BYOD host: ${host}`,
			flags,
		});
	}
}
