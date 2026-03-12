import { handleDispense } from "@utils/dispenseResponse";
import { ComponentCommand, type ComponentContext } from "seyfert";

const dispensePrefix = "dispense:";

export default class DispenseButton extends ComponentCommand {
	componentType = "Button" as const;

	override filter(ctx: ComponentContext<typeof this.componentType>) {
		return ctx.customId.startsWith(dispensePrefix);
	}

	async run(ctx: ComponentContext<typeof this.componentType>) {
		const categoryId = ctx.customId.slice(dispensePrefix.length);
		await handleDispense(ctx, categoryId);
	}
}
