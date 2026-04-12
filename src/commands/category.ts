import { Command, Declare, Options } from "seyfert";
import CreateCategoryCommand from "./category/create";
import DeleteCategoryCommand from "./category/delete";
import ListCategoriesCommand from "./category/list";
import RenameCategoryCommand from "./category/rename";
import ReorderCategoryCommand from "./category/reorder";
import SetEmojiCommand from "./category/setEmoji";
import ToggleFilterApiCommand from "./category/toggleFilterApi";
import ToggleMasqrCommand from "./category/toggleMasqr";

@Declare({
	name: "category",
	description: "Manage categories",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: 0n,
})
@Options([
	CreateCategoryCommand,
	RenameCategoryCommand,
	DeleteCategoryCommand,
	SetEmojiCommand,
	ListCategoriesCommand,
	ReorderCategoryCommand,
	ToggleFilterApiCommand,
	ToggleMasqrCommand,
])
export default class CategoryCommand extends Command {}
