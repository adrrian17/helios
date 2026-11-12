export interface Mailer {
  sendMagicLink: (to: string, url: string) => Promise<void>;
}

/**
 * Development and test Mailer: keeps the latest link per address instead of
 * sending email. The server never builds this one in production.
 */
export const createCaptureMailer = (
  onCapture?: (to: string, url: string) => void
) => {
  const links = new Map<string, string>();

  return {
    sendMagicLink: async (to: string, url: string) => {
      links.set(to.toLowerCase(), url);
      onCapture?.(to, url);
      await Promise.resolve();
    },
    lastLinkTo: (to: string) => links.get(to.toLowerCase()),
    clear: () => {
      links.clear();
    },
  };
};
