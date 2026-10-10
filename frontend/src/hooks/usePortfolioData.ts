import { useEffect, useState } from "react";
import { getPortfolio } from "../services/api";
import snapshot from "../../../content/portfolio.json";
import type { PortfolioData } from "../types/portfolio";
export function usePortfolioData() {
  const [data, setData] = useState<PortfolioData>(snapshot);
  const [source, setSource] = useState<"connecting" | "api" | "snapshot">(
    "connecting",
  );
  useEffect(() => {
    let alive = true;
    getPortfolio()
      .then((result) => {
        if (alive) {
          setData(result);
          setSource("api");
        }
      })
      .catch(() => {
        if (alive) setSource("snapshot");
      });
    return () => {
      alive = false;
    };
  }, []);
  return { data, source };
}
