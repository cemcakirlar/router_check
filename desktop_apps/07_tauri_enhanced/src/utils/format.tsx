export function FormatBytes({ bytes }: { bytes: number | null | undefined }) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) {
    return <>0 <small className="unit">B</small></>;
  }
  if (bytes === 0) {
    return <>0 <small className="unit">B</small></>;
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return (
    <>
      {val} <small className="unit">{sizes[i]}</small>
    </>
  );
}

export function FormatSpeed({ bps }: { bps: number | null | undefined }) {
  if (bps === null || bps === undefined || isNaN(bps)) {
    return <>0 <small className="unit">bps</small></>;
  }
  if (bps < 1000) {
    return <>{bps} <small className="unit">bps</small></>;
  }
  if (bps < 1000000) {
    return <>{(bps / 1000).toFixed(2)} <small className="unit">Kbps</small></>;
  }
  return <>{(bps / 1000000).toFixed(2)} <small className="unit">Mbps</small></>;
}

export function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "--";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
