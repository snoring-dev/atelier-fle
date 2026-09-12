import { getGotenbergUrl, getPublicInternalUrl } from "@/lib/pdf/env";

export class GotenbergError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GotenbergError";
  }
}

/**
 * Ask Gotenberg to render `/impression/[id]?t=…` as A4 PDF (CSS @page margins).
 */
export async function renderImpressionPdf(
  ficheId: number,
  printToken: string,
): Promise<ArrayBuffer> {
  const impressionUrl = `${getPublicInternalUrl()}/impression/${ficheId}?t=${encodeURIComponent(printToken)}`;

  const form = new FormData();
  form.set("url", impressionUrl);
  form.set("preferCssPageSize", "true");
  form.set("printBackground", "true");
  form.set("paperWidth", "8.27");
  form.set("paperHeight", "11.7");
  form.set("marginTop", "0");
  form.set("marginBottom", "0");
  form.set("marginLeft", "0");
  form.set("marginRight", "0");
  form.set("waitForExpression", "document.fonts.status === 'loaded'");
  form.set("skipNetworkIdleEvent", "false");

  const response = await fetch(
    `${getGotenbergUrl()}/forms/chromium/convert/url`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new GotenbergError(
      `Gotenberg failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      response.status,
    );
  }

  return response.arrayBuffer();
}
