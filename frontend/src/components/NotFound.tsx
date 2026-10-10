import { SpiderFallback } from "./SpiderFallback";
export function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">404 / NO ANCHOR FOUND</span>
      <h1>
        This thread leads
        <br />
        to an empty web.
      </h1>
      <p>The page you’re looking for isn’t here.</p>
      <a href="/" className="button primary">
        Back to the portfolio ↗
      </a>
      <SpiderFallback
        reduced
        label="Return to the portfolio"
        onOpen={() => {
          window.location.href = "/";
        }}
      />
    </main>
  );
}
