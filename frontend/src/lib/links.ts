const ADDRESS = /^G[A-Z2-7]{55}$/;
const PATH = /^\/(s\/G[A-Z2-7]{55}|g\/\d+|c\/\d+)\/?$/;

/**
 * Turns a pasted shop link, shop address, card link or chip in link into a route on this site.
 * Links from any host are accepted, so a link made on another device still opens here.
 */
export function routeFromPaste(text: string): string | undefined {
  const value = text.trim();
  if (ADDRESS.test(value.toUpperCase())) return `/s/${value.toUpperCase()}`;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return undefined;
  }
  return PATH.test(url.pathname) ? url.pathname.replace(/\/$/, "") + url.hash : undefined;
}
