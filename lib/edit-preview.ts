/** postMessage az előnézet iframe-nek */
export function postToPreviewIframe(
  iframe: HTMLIFrameElement | null,
  message: Record<string, unknown>
): void {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(message, '*');
}

export function setPreviewSiteId(iframe: HTMLIFrameElement | null, siteId: string): void {
  postToPreviewIframe(iframe, { type: 'cms-set-site-id', siteId });
}

export function updatePreviewField(
  iframe: HTMLIFrameElement | null,
  dataCmsKey: string,
  value: string,
  fieldType: string
): void {
  postToPreviewIframe(iframe, {
    type: 'cms-update-field',
    dataCmsKey,
    value,
    fieldType,
  });
}

export function scrollPreviewToField(
  iframe: HTMLIFrameElement | null,
  dataCmsKey: string
): void {
  postToPreviewIframe(iframe, { type: 'cms-scroll-to', dataCmsKey });
}
