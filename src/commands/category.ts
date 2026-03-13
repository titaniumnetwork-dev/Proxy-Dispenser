import { Command, Declare, Options } from "seyfert";
import CreateCategoryCommand from "./category/create";
import DeleteCategoryCommand from "./category/delete";
import ListCategoriesCommand from "./category/list";
import RenameCategoryCommand from "./category/rename";
import SetEmojiCommand from "./category/setEmoji";
import ToggleFilterApiCommand from "./category/toggleFilterApi";

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
	ToggleFilterApiCommand,
])
export default class CategoryCommand extends Command {}
