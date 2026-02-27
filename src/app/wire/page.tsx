export default function WirePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">The Wire</h1>
        <p className="text-sm text-muted-foreground">
          AI-curated newsfeed with sentiment analysis — coming in Phase 2
        </p>
      </div>
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
        The Wire will display classified news with sentiment tags, source quality ratings, and emerging narrative detection.
      </div>
    </div>
  );
}
