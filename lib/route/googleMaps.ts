/** Googleマップでその場所を開くURL（アプリでもブラウザでも開ける公式フォーマット）。 */
export function googleMapsPlaceUrl(place: { name?: string | null; lat: number; lng: number }): string {
  const params = new URLSearchParams({ api: '1', query: `${place.lat},${place.lng}` });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
