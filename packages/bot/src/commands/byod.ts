import {Declare, Command, Options} from 'seyfert';
import {ListCommand} from './byod/list';
import {UnsetCommand} from './byod/unset';

@Declare({
  name: 'byod',
  description: 'Manage BYOD',
  integrationTypes: ['GuildInstall', 'UserInstall'],
  contexts: ['Guild', 'BotDM', 'PrivateChannel'],
})
@Options([ListCommand, UnsetCommand])
export default class BYODCommand extends Command {}
