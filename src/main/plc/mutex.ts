export class Mutex {
  private queue = Promise.resolve()

  acquire(): Promise<() => void> {
    let release!: () => void
    const ticket = new Promise<void>((resolve) => {
      release = resolve
    })
    const previous = this.queue
    this.queue = previous.then(() => ticket)
    return previous.then(() => release)
  }
}
