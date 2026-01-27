import { Declare, Command, Options } from 'seyfert';
import { ListCommand } from './hosts/list';
import { RemoveCommand } from './hosts/remove';

@Declare({
	name: "hosts",
	description: "Manage BYOD hosts",
	integrationTypes: ['GuildInstall', 'UserInstall'],
	contexts: ['Guild', 'BotDM', 'PrivateChannel']
})
@Options([ListCommand, RemoveCommand])
export default class HostsCommand extends Command {}