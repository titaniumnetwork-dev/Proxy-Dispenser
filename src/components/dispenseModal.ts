import { handleDispense } from "@utils/dispenseResponse";
import { ComponentCommand, type ComponentContext } from "seyfert";

const dispensePrefix = "dispense:";

export default class DispenseSelect extends ComponentCommand {
	componentType = "StringSelect" as const;

	override filter(ctx: ComponentContext<typeof this.componentType>) {
		return ctx.customId.startsWith(dispensePrefix);
	}

	async run(ctx: ComponentContext<typeof this.componentType>) {
		const categoryId = ctx.interaction.values[0] as string;
		await ctx.update({});

		await handleDispense(ctx, categoryId, "followup");
	}
}
