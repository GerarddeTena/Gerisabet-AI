import clearCommand from './clear'
import helpCommand from './help'
import modelCommand from './model'
import costCommand from './cost'
import statusCommand from './status'
import compactCommand from './compact'
import doctorCommand from './doctor'
import skillsCommand from './skills'
import configCommand from './config'
import exportCommand from './export'
import renameCommand from './rename'
import { registerCommands } from '../commands'

export function registerAllCommands(): void {
  registerCommands([
    clearCommand,
    helpCommand,
    modelCommand,
    costCommand,
    statusCommand,
    compactCommand,
    doctorCommand,
    skillsCommand,
    configCommand,
    exportCommand,
    renameCommand,
  ])
}
