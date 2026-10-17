/**
 * ダークモードのちらつき（FOUC）を防ぐため、描画前に class を付ける。
 * 設定は localStorage の tabimemo-theme に保存し、無ければOSの設定に従う。
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('tabimemo-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || (!stored && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
