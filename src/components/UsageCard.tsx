import { FormatBytes, formatTime } from "../utils/format";
import { useRouterState } from "../context/RouterStateContext";

export default function UsageCard() {
  const { monthlyRx, monthlyTx, monthlyTime, provider, networkType } = useRouterState();

  const totalUsage = (monthlyRx || 0) + (monthlyTx || 0);

  return (
    <div className="card md:col-span-4">
      <div className="card-title">📊 Monthly Data</div>
      <div className="big-value">
        <FormatBytes bytes={totalUsage} />
      </div>
      <div className="sub-value">{formatTime(monthlyTime)}</div>
      <div className="usage-split">
        <div className="flex-1">
          <div className="sub-value">Monthly DL</div>
          <div className="text-main font-strong">
            <FormatBytes bytes={monthlyRx} />
          </div>
        </div>
        <div className="flex-1">
          <div className="sub-value">Monthly UL</div>
          <div className="text-main font-strong">
            <FormatBytes bytes={monthlyTx} />
          </div>
        </div>
      </div>
      <div className="sub-value mt-sm">
        Provider: <span className="text-main">{provider || "--"}</span>
        <span className="meta-sep">|</span>
        Type: <span className="text-main">{networkType || "--"}</span>
      </div>
    </div>
  );
}
