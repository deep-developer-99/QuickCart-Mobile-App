export const normalizeVoiceQuery = (value: string) => value.trim().replace(/\s+/g, ' ');

export class VoiceSearchSessionGuard {
  private generation = 0;
  private completed = true;

  begin() {
    this.generation += 1;
    this.completed = false;
    return this.generation;
  }

  isActive(generation: number) {
    return generation === this.generation && !this.completed;
  }

  finish(generation: number) {
    if (!this.isActive(generation)) return false;
    this.completed = true;
    return true;
  }

  cancel() {
    this.generation += 1;
    this.completed = true;
  }
}
