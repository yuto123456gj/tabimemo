/** 座標が未設定のスポットを安全に扱うための補助 */

export interface MaybeLocated {
  lat: number | null;
  lng: number | null;
}

export type Located<T extends MaybeLocated> = T & { lat: number; lng: number };

/** 地図に出せる（緯度経度がそろっている）スポットか */
export function hasLocation<T extends MaybeLocated>(place: T): place is Located<T> {
  return (
    typeof place.lat === 'number' &&
    typeof place.lng === 'number' &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng)
  );
}

/** 座標が決まっているものだけを取り出す */
export function onlyLocated<T extends MaybeLocated>(places: T[]): Located<T>[] {
  return places.filter(hasLocation);
}
