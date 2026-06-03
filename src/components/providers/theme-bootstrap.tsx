/** Applique thème/langue avant hydratation pour éviter un flash. */
export function ThemeBootstrap() {
  const script = `
(function() {
  try {
    var t = localStorage.getItem('retvy-theme');
    var l = localStorage.getItem('retvy-locale');
    var root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(t === 'light' ? 'light' : 'dark');
    root.lang = l === 'en' ? 'en' : 'fr';
  } catch (e) {}
})();
`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
