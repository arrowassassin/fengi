/** Tiny DOM builder helpers — keeps screens readable without a framework. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: { className?: string; text?: string; title?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs.className !== undefined) node.className = attrs.className;
  if (attrs.text !== undefined) node.textContent = attrs.text;
  if (attrs.title !== undefined) node.title = attrs.title;
  node.append(...children);
  return node;
}

export function button(label: string, onClick: () => void, className?: string): HTMLButtonElement {
  const node = el("button", { text: label });
  if (className !== undefined) node.className = className;
  node.addEventListener("click", onClick);
  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}
