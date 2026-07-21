// Tiny global store for the active Virtual Library call so App-level UI
// (floating "You are live" banner + Picture-in-Picture) works after the
// user navigates away from /virtual-library while their camera/mic are on.

type Listener = () => void;

export type LiveCallState = {
  active: boolean;
  roomCode: string | null;
  roomName: string | null;
  stream: MediaStream | null;
  onLeave: (() => void) | null;
  onOpenRoom: (() => void) | null;
};

const state: LiveCallState = {
  active: false,
  roomCode: null,
  roomName: null,
  stream: null,
  onLeave: null,
  onOpenRoom: null,
};

const listeners = new Set<Listener>();

export const liveCall = {
  get() {
    return state;
  },
  set(patch: Partial<LiveCallState>) {
    Object.assign(state, patch);
    listeners.forEach((l) => l());
  },
  clear() {
    state.active = false;
    state.roomCode = null;
    state.roomName = null;
    state.stream = null;
    state.onLeave = null;
    state.onOpenRoom = null;
    listeners.forEach((l) => l());
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};