export interface CommandIO {
  log(message: string): void;
  error(message: string): void;
}

export const consoleIO: CommandIO = {
  log(message) {
    console.log(message);
  },
  error(message) {
    console.error(message);
  }
};
