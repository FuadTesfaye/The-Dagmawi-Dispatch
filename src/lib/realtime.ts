import { RealtimeEvent } from './types';

type ClientListener = (event: RealtimeEvent) => void;

class RealtimeHub {
  private listeners: Set<ClientListener> = new Set();

  public subscribe(listener: ClientListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(event: RealtimeEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[realtime] listener delivery error:', err);
      }
    }
  }

  public getSubscriberCount(): number {
    return this.listeners.size;
  }
}

// Global singleton across server invocations
declare global {
  // eslint-disable-next-line no-var
  var __realtimeHub: RealtimeHub | undefined;
}

export const realtimeHub = global.__realtimeHub || new RealtimeHub();
if (process.env.NODE_ENV !== 'production') {
  global.__realtimeHub = realtimeHub;
}
