import { CommandStack as CommandStackInterface, TransformCommand } from './types.js';

export class CommandStack implements CommandStackInterface {
  private stack: TransformCommand[] = [];
  private redoStack: TransformCommand[] = [];

  push(command: TransformCommand): void {
    this.stack.push(command);
    this.redoStack = [];
  }

  undo(): TransformCommand | undefined {
    const command = this.stack.pop();
    if (command) {
      this.redoStack.push(command);
    }
    return command;
  }

  redo(): TransformCommand | undefined {
    const command = this.redoStack.pop();
    if (command) {
      this.stack.push(command);
    }
    return command;
  }

  clear(): void {
    this.stack = [];
    this.redoStack = [];
  }
}
