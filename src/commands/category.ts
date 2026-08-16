import { Command, Declare, Options } from "seyfert";
import CreateCategoryCommand from "./category/create";
import DeleteCategoryCommand from "./category/delete";
import SetLimitCommand from "./category/limit";
import ListCategoriesCommand from "./category/list";
import RenameCategoryCommand from "./category/rename";
import ReorderCategoryCommand from "./category/reorder";
import EmojiCommand from "./category/emoji";
import ChannelCommand from "./category/channel";
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
	EmojiCommand,
	ChannelCommand,
	ListCategoriesCommand,
	ReorderCategoryCommand,
	SetLimitCommand,
	ToggleFilterApiCommand,
	ToggleMasqrCommand,
])
export default class CategoryCommand extends Command {}
