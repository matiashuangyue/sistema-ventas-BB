export default function LoadingContent({ loading, loadingText, children }) {
  return (
    <span className="button-loading-content">
      {loading && <span className="button-loading-spinner" aria-hidden="true" />}
      <span>{loading ? loadingText : children}</span>
    </span>
  );
}
