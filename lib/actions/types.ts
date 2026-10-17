export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export function succeed<T>(data?: T): ActionResult<T> {
  return { ok: true, data };
}
