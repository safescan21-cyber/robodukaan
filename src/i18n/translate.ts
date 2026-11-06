// Shared by server and client: look up a key, fall back to English, fill {placeholders}.
export type Dict = Record<string, string>;

export function makeT(dict: Dict, fallback: Dict) {
  return (key: string, vars?: Record<string, string | number>) => {
    let s = dict[key] ?? fallback[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
