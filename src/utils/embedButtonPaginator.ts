/**
 * @fileoverview Contains a utility class for paginating buttons.
 * @module utils/button-paginator
 */

import { ActionRow, Button } from "seyfert";
import { ButtonStyle } from "seyfert/lib/types";

/**
 * Button custom IDs for the paginator navigation.
 */
export enum PaginatorButtonId {
	Cancel = "button-paginator-cancel",
	Prev = "button-paginator-prev",
	Next = "button-paginator-next",
	Indicator = "button-paginator-indicator",
}

/**
 * Navigation direction types for the paginator.
 */
export enum NavigationType {
	Prev = "prev",
	Next = "next",
}

/**
 * Configuration for a button in the paginator.
 */
export interface ButtonConfig {
	/**
	 * Custom ID for the button.
	 */
	id: string;
	/**
	 * Label for the button.
	 */
	label: string;
	/**
	 * Style for the button.
	 */
	style?: ButtonStyle;
}

/**
 * Options for the paginator.
 */
export interface PaginationOptions {
	/**
	 * Number of buttons per row.
	 * @default 5
	 */
	buttonsPerRow?: number;
	/**
	 * Maximum number of rows to display (including navigation row).
	 * @default 5
	 */
	maxRows?: number;
	/**
	 * Whether to display a cancel button.
	 * @default true
	 */
	showCancelButton?: boolean;
	/**
	 * Label for the cancel button.
	 * @default "Cancel"
	 */
	cancelButtonLabel?: string;
}

/**
 * Default options for the paginator.
 */
const DEFAULTS: Required<PaginationOptions> = {
	buttonsPerRow: 5,
	maxRows: 5,
	showCancelButton: true,
	cancelButtonLabel: "Cancel",
};

/**
 * A paginator used to assemble **buttons** (not into pages) for Discord messages, to get past the limits *(5 buttons * 3 rows = **15 buttons**)*.
 * This is used for category selection prompts and in the `/panel` command. This is used in the edge case that the server has more than 15 categories.
 */
export class ButtonPaginator<T extends ButtonConfig> {
	/**
	 * Buttons to paginate.
	 */
	private readonly buttons: readonly T[];
	/**
	 * Pagination options.
	 */
	private readonly opts: Required<PaginationOptions>;
	/**
	 * Number of buttons per page (accounting for navigation row).
	 */
	private readonly perPage: number;

	constructor(buttons: readonly T[], options: PaginationOptions = {}) {
		this.buttons = buttons;
		this.opts = { ...DEFAULTS, ...options };
		const contentRows = this.opts.maxRows - 1;
		this.perPage = Math.max(1, this.opts.buttonsPerRow * contentRows);
	}

	/**
	 * Total number of pages to display.
	 * @returns Total number of pages.
	 */
	get totalPages(): number {
		if (this.buttons.length === 0) return 1;
		return Math.ceil(this.buttons.length / this.perPage);
	}

	/**
	 * Get a page of buttons.
	 * @param page Page number to get (indexed from `0`).
	 * @param disabled Whether the buttons should be disabled. This is used when the paginator expires.
	 * @returns Action rows containing the buttons for the specified page.
	 */
	getPage(page: number, disabled = false): ActionRow<Button>[] {
		const clampedPage = Math.max(0, Math.min(page, this.totalPages - 1));

		const pageButtons: Button[] = this.buttons
			.slice(clampedPage * this.perPage, (clampedPage + 1) * this.perPage)
			.map((button) =>
				new Button()
					.setCustomId(button.id)
					.setLabel(button.label)
					.setStyle(button.style ?? ButtonStyle.Primary)
					.setDisabled(disabled),
			);

		const rows: ActionRow<Button>[] = [];
		for (
			let i = 0;
			i < pageButtons.length && rows.length < this.opts.maxRows - 1;
			i += this.opts.buttonsPerRow
		) {
			rows.push(
				new ActionRow<Button>().addComponents(
					...pageButtons.slice(i, i + this.opts.buttonsPerRow),
				),
			);
		}

		if (this.totalPages > 1) {
			rows.push(this.getNavigationRow(clampedPage, disabled));
		} else if (this.opts.showCancelButton) {
			rows.push(
				new ActionRow<Button>().addComponents(
					new Button()
						.setCustomId(PaginatorButtonId.Cancel)
						.setLabel(this.opts.cancelButtonLabel)
						.setStyle(ButtonStyle.Danger)
						.setDisabled(disabled),
				),
			);
		}

		return rows;
	}

	/**
	 * Get the target page from a navigation button click.
	 * @param customId Custom ID from the button interaction.
	 * @returns Target page number, or `null` if not a valid navigation.
	 */
	static getTargetPage(customId: string): number | null {
		const nav = ButtonPaginator.parseNavigationButtonCustomId(customId);
		if (!nav) return null;
		return nav.type === NavigationType.Prev
			? nav.currentPage - 1
			: nav.currentPage + 1;
	}

	/**
	 * Check if a custom ID is the cancel button.
	 * @param customId Custom ID from the button interaction.
	 */
	static isCancel(customId: string): boolean {
		return customId === PaginatorButtonId.Cancel;
	}

	/**
	 * Parse a navigation button custom ID to get the target page.
	 * @param customId Custom ID from the button interaction.
	 * @returns Target page number for prev/next, or `null` if not a navigation button.
	 */
	static parseNavigationButtonCustomId(
		customId: string,
	): { type: NavigationType; currentPage: number } | null {
		if (customId.startsWith(`${PaginatorButtonId.Prev}:`)) {
			const pageNumber = Number.parseInt(customId.split(":")[1] ?? "", 10);
			if (!Number.isNaN(pageNumber))
				return { type: NavigationType.Prev, currentPage: pageNumber };
		}
		if (customId.startsWith(`${PaginatorButtonId.Next}:`)) {
			const pageNumber = Number.parseInt(customId.split(":")[1] ?? "", 10);
			if (!Number.isNaN(pageNumber))
				return { type: NavigationType.Next, currentPage: pageNumber };
		}
		return null;
	}

	/**
	 * Gets the action row containing the paginator buttons.
	 * @param currentPage Current page number (indexed from `0`).
	 * @param disabled Whether the buttons should be disabled. This is used for when the paginator expires.
	 * @returns An action row containing the paginator buttons.
	 */
	private getNavigationRow(
		currentPage: number,
		disabled = false,
	): ActionRow<Button> {
		const indicator = new Button()
			.setCustomId(PaginatorButtonId.Indicator)
			.setLabel(`${currentPage + 1}/${this.totalPages}`)
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true);

		const prevButton = new Button()
			.setCustomId(`${PaginatorButtonId.Prev}:${currentPage}`)
			.setLabel("Previous")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled || currentPage === 0);

		const nextButton = new Button()
			.setCustomId(`${PaginatorButtonId.Next}:${currentPage}`)
			.setLabel("Next")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled || currentPage === this.totalPages - 1);

		const navButtons: Button[] = [indicator, prevButton, nextButton];

		if (this.opts.showCancelButton) {
			navButtons.push(
				new Button()
					.setCustomId(PaginatorButtonId.Cancel)
					.setLabel(this.opts.cancelButtonLabel)
					.setStyle(ButtonStyle.Danger)
					.setDisabled(disabled),
			);
		}

		return new ActionRow<Button>().addComponents(...navButtons);
	}

	*[Symbol.iterator](): Generator<{
		page: number;
		rows: ActionRow<Button>[];
		hasMore: boolean;
		hasBack: boolean;
	}> {
		for (let page = 0; page < this.totalPages; page++) {
			yield {
				page,
				rows: this.getPage(page),
				hasMore: page < this.totalPages - 1,
				hasBack: page > 0,
			};
		}
	}
}
