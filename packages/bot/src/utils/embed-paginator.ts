/**
 * @fileoverview A utility class for paginating embeds using buttons.
 * @module utils/embed-paginator
 */

import { ActionRow, Button, type CommandContext, type Embed } from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";
import { IDLE_TIMEOUT } from "@/consts.ts";

/**
 * Button custom IDs for the paginator.
 */
export enum EmbedPaginatorButtonId {
	Prev = "embed-paginator-prev",
	Next = "embed-paginator-next",
	Indicator = "embed-paginator-indicator",
}

/**
 * A paginator for embeds.
 */
export class EmbedPaginator {
	private currentPage = 0;
	private embeds: Embed[];
	private ctx: CommandContext;
	private ephemeral: boolean;

	/**
	 * @param ctx Seyfert command context.
	 * @param embeds Embeds to paginate.
	 * @param ephemeral Whether the response should be ephemeral.
	 */
	constructor(ctx: CommandContext, embeds: Embed[], ephemeral = true) {
		this.ctx = ctx;
		this.embeds = embeds;
		this.ephemeral = ephemeral;
	}

	/**
	 * Starts the pagination.
	 */
	async start(): Promise<void> {
		if (this.embeds.length === 0) return;

		if (this.embeds.length === 1) {
			const embed = this.embeds[0];
			if (!embed) return;

			await this.ctx.editOrReply({
				embeds: [embed],
				components: [],
				flags: this.ephemeral ? MessageFlags.Ephemeral : undefined,
			});
		}

		const firstEmbed = this.embeds[0];
		if (!firstEmbed) return;

		const message = await this.ctx.editOrReply({
			embeds: [firstEmbed],
			components: [this.getNavigationRow()],
			flags: this.ephemeral ? MessageFlags.Ephemeral : undefined,
		});

		if (!message) return;

		const collector = message.createComponentCollector({
			filter: (interaction) =>
				interaction.user.id === this.ctx.author.id && interaction.isButton(),
			idle: IDLE_TIMEOUT,
			onStop: async (reason) => {
				if (reason === "idle") {
					await message.edit({
						components: [this.getNavigationRow(true)],
					});
				}
			},
		});

		collector.run(EmbedPaginatorButtonId.Prev, async (interaction) => {
			if (this.currentPage > 0) {
				this.currentPage--;

				const embed = this.embeds[this.currentPage];
				if (embed) {
					await interaction.update({
						embeds: [embed],
						components: [this.getNavigationRow()],
					});
				}
			} else {
				await interaction.deferUpdate();
			}
		});

		collector.run(EmbedPaginatorButtonId.Next, async (interaction) => {
			if (this.currentPage < this.embeds.length - 1) {
				this.currentPage++;

				const embed = this.embeds[this.currentPage];
				if (embed) {
					await interaction.update({
						embeds: [embed],
						components: [this.getNavigationRow()],
					});
				}
			} else {
				await interaction.deferUpdate();
			}
		});

		return;
	}

	/**
	 * Gets the action row containing the paginator buttons.
	 * @param disabled Whether the buttons should be disabled. This is used for when the paginator expires.
	 * @returns An action row containing the paginator buttons.
	 */
	private getNavigationRow(disabled = false): ActionRow<Button> {
		const indicator = new Button()
			.setCustomId(EmbedPaginatorButtonId.Indicator)
			.setLabel(`${this.currentPage + 1}/${this.embeds.length}`)
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true);

		const prevButton = new Button()
			.setCustomId(EmbedPaginatorButtonId.Prev)
			.setLabel("Previous")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled || this.currentPage === 0);

		const nextButton = new Button()
			.setCustomId(EmbedPaginatorButtonId.Next)
			.setLabel("Next")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled || this.currentPage === this.embeds.length - 1);

		return new ActionRow<Button>().setComponents([
			indicator,
			prevButton,
			nextButton,
		]);
	}
}
