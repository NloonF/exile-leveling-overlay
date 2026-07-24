type ShortcutKeyboardEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "key" | "shiftKey"
>;

export function shortcutFromKeyboardEvent(
  event: ShortcutKeyboardEvent,
): string | null {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  if (modifiers.length === 0) return null;

  let key: string | null = null;
  if (/^Key[A-Z]$/.test(event.code)) {
    key = event.code.slice(3);
  } else if (/^Digit[0-9]$/.test(event.code)) {
    key = event.code.slice(5);
  } else if (/^F(?:[1-9]|1[0-2])$/.test(event.key)) {
    key = event.key;
  }

  return key === null ? null : [...modifiers, key].join("+");
}
