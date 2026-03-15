/**
 * @fileoverview A utility class for paginating link lists using Discord Components V2. This is used by the `/links list`, and it will be used by by the `/link-history` command.
 * @module utils/link-list-paginator
 */
import { DISCORD_TEXT_DISPLAY_LIMIT, IDLE_TIMEOUT } from "@consts";
import type { CommandContext } from "seyfert";
import { ActionRow, Button, Container, TextDisplay } from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";
import { t } from "try";

/**
 * Button custom IDs for the link list paginator.
 */
export enum LinkListPaginatorButtonId {
	Prev = "link-list-prev",
	Next = "link-list-next",
	Indicator = "link-list-indicator",
}

/**
 * Options for creating a link list embed.
 */
export interface CreateLinkListEmbedOptions {
	/**
	 * Seyfert command context.
	 */
	ctx: CommandContext;
	/**
	 * Markdown title for the embed.
	 */
	mdTitle: string;
	/**
	 * Description for the embed.
	 */
	description: string;
	/**
	 * Text to display when there are no links.
	 */
	noLinksText: string;
	/**
	 * Links grouped by category.
	 */
	linksByCategory: Record<string, string[]>;
	/**
	 * Map of link to user counts.
	 */
	linkUserCounts?: Map<string, number>;
	/**
	 * Whether the response should be ephemeral.
	 */
	ephemeral?: boolean;
}

/**
 * A paginator for link lists using Discord Components V2.
 */
export class LinkListPaginator {
	private currentPage = 0;
	private pages: string[];
	private ctx: CommandContext;
	private ephemeral: boolean;

	/**
	 * @param ctx Seyfert command context.
	 * @param pages Page content.
	 * @param ephemeral Whether the response should be ephemeral.
	 */
	constructor(ctx: CommandContext, pages: string[], ephemeral = true) {
		this.ctx = ctx;
		this.pages = pages;
		this.ephemeral = ephemeral;
	}

	/**
	 * Starts the pagination.
	 */
	async start(): Promise<void> {
		if (this.pages.length === 0) return;

		const flags = this.ephemeral
			? MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
			: MessageFlags.IsComponentsV2;

		if (this.pages.length === 1) {
			const pageContent = this.pages[0];
			if (!pageContent) return;

			const container = new Container().addComponents(
				new TextDisplay().setContent(pageContent),
			);

			await this.ctx.editOrReply({
				components: [container],
				flags,
			});
			return;
		}

		const firstPage = this.pages[0];
		if (!firstPage) return;

		const message = await this.ctx.editOrReply({
			components: this.getPageComponents(),
			flags,
		});
		if (!message) return;

		const collector = message.createComponentCollector({
			filter: (interaction) =>
				interaction.user.id === this.ctx.author.id && interaction.isButton(),
			idle: IDLE_TIMEOUT,
			onStop: async (reason) => {
				if (reason === "idle") {
					const [, editError] = await t(
						message.edit({
							components: this.getPageComponents(true),
						}),
					);
					if (editError) {
						this.ctx.client.logger.error(
							`Failed to disable paginator buttons: ${editError}`,
						);
					}
				}
			},
		});

		collector.run(LinkListPaginatorButtonId.Prev, async (interaction) => {
			if (this.currentPage > 0) {
				this.currentPage--;
				await interaction.update({
					components: this.getPageComponents(),
				});
			} else {
				await interaction.deferUpdate();
			}
		});

		collector.run(LinkListPaginatorButtonId.Next, async (interaction) => {
			if (this.currentPage < this.pages.length - 1) {
				this.currentPage++;
				await interaction.update({
					components: this.getPageComponents(),
				});
			} else {
				await interaction.deferUpdate();
			}
		});
	}

	/**
	 * Gets the components for the current page including container and navigation row.
	 * @param disabled Whether the buttons should be disabled. This is used for when the paginator expires.
	 * @returns Container and navigation row components.
	 */
	private getPageComponents(disabled = false): [Container, ActionRow<Button>] {
		const pageContent = this.pages[this.currentPage] ?? "";

		const container = new Container().addComponents(
			new TextDisplay().setContent(pageContent),
		);

		const indicator = new Button()
			.setCustomId(LinkListPaginatorButtonId.Indicator)
			.setLabel(`${this.currentPage + 1}/${this.pages.length}`)
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true);

		const prevButton = new Button()
			.setCustomId(LinkListPaginatorButtonId.Prev)
			.setLabel("Previous")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled || this.currentPage === 0);

		const nextButton = new Button()
			.setCustomId(LinkListPaginatorButtonId.Next)
			.setLabel("Next")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled || this.currentPage === this.pages.length - 1);

		const navRow = new ActionRow<Button>().setComponents([
			indicator,
			prevButton,
			nextButton,
		]);

		return [container, navRow];
	}

	/**
	 * Creates pages from link data for the paginator.
	 * @param mdTitle Markdown title.
	 * @param description Markdown description.
	 * @param linksByCategory Links grouped by category.
	 * @param linkUserCounts Optionally, a map of link user counts.
	 * @returns Pages for the paginator.
	 */
	public static createLinkPages(
		mdTitle: string,
		description: string,
		linksByCategory: Record<string, string[]>,
		linkUserCounts?: Map<string, number>,
	): string[] {
		const pages: string[] = [];
		const categories = Object.keys(linksByCategory).sort();

		let currentPage = `# ${mdTitle}\n${description}\n\n`;

		for (const category of categories) {
			const categoryLinks = linksByCategory[category];
			if (!categoryLinks) continue;

			let categorySection = `## ${category}\n`;
			for (const link of categoryLinks) {
				let line = `* ${link}`;
				if (linkUserCounts) {
					const count = linkUserCounts.get(link) ?? 0;
					line += ` (${count} ${count === 0 ? "no users" : count === 1 ? "user" : "users"})`;
				}
				categorySection += `${line}\n`;
			}
			categorySection += "\n";

			if (
				currentPage.length + categorySection.length >
				DISCORD_TEXT_DISPLAY_LIMIT
			) {
				pages.push(currentPage);
				currentPage = `# ${mdTitle} (continued)\n\n${categorySection}`;
			} else {
				currentPage += categorySection;
			}
		}

		if (currentPage.length > 0) {
			pages.push(currentPage);
		}

		return pages;
	}

	/**
	 * Creates a paginated link list using Discord Components V2.
	 * @param options Options for creating the link list embed.
	 */
	public static async createLinkListEmbed(
		options: CreateLinkListEmbedOptions,
	): Promise<void> {
		const {
			ctx,
			mdTitle,
			description,
			noLinksText,
			linksByCategory,
			linkUserCounts,
			ephemeral = true,
		} = options;

		const categories = Object.keys(linksByCategory);

		if (categories.length === 0) {
			const container = new Container().addComponents(
				new TextDisplay().setContent(`# ${mdTitle}\n\n${noLinksText}`),
			);

			const flags = ephemeral
				? MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
				: MessageFlags.IsComponentsV2;

			await ctx.editOrReply({
				components: [container],
				flags,
			});

			return;
		}

		const pages = LinkListPaginator.createLinkPages(
			mdTitle,
			description,
			linksByCategory,
			linkUserCounts,
		);
		const paginator = new LinkListPaginator(ctx, pages, ephemeral);
		await paginator.start();
	}
}
