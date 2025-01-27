"use client";

import { Bar, Line, Pie, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  LogarithmicScale,
  ChartData,
  ChartOptions,
  ScaleOptionsByType,
  CartesianScaleOptions,
  ChartDataset,
} from "chart.js";
import "chartjs-adapter-date-fns"; // For time scale
import { type ChartConfig } from "../services/ai.service";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  LogarithmicScale
);

interface DataChartProps {
  config: ChartConfig;
  className?: string;
}

type ChartType = "bar" | "line" | "pie" | "scatter";

export function DataChart({ config, className = "" }: DataChartProps) {
  // Process data based on chart type
  const processBarData = (): ChartData<"bar"> => ({
    labels: config.data.labels,
    datasets: config.data.datasets.map((dataset) => ({
      ...dataset,
      type: "bar" as const,
      data: dataset.data.map((value) => {
        if (value instanceof Date) {
          return value.getTime();
        }
        return value as number;
      }),
      borderWidth: 1,
    })) as ChartDataset<"bar", number[]>[],
  });

  const processLineData = (): ChartData<"line"> => ({
    labels: config.data.labels,
    datasets: config.data.datasets.map((dataset) => ({
      ...dataset,
      type: "line" as const,
      data: dataset.data.map((value) => {
        if (value instanceof Date) {
          return value.getTime();
        }
        return value as number;
      }),
      borderWidth: 1,
    })) as ChartDataset<"line", number[]>[],
  });

  const processPieData = (): ChartData<"pie"> => ({
    labels: config.data.labels,
    datasets: config.data.datasets.map((dataset) => ({
      ...dataset,
      type: "pie" as const,
      data: dataset.data.map((value) => {
        if (value instanceof Date) {
          return value.getTime();
        }
        return value as number;
      }),
      borderWidth: 1,
    })) as ChartDataset<"pie", number[]>[],
  });

  const processScatterData = (): ChartData<"scatter"> => ({
    labels: config.data.labels,
    datasets: config.data.datasets.map((dataset) => ({
      ...dataset,
      type: "scatter" as const,
      data: dataset.data.map((value) => {
        if (value instanceof Date) {
          return value.getTime();
        }
        return value as number;
      }),
      borderWidth: 1,
    })) as ChartDataset<"scatter", number[]>[],
  });

  const getBaseOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: config.options.title,
      },
    },
  });

  const getCartesianOptions = () => ({
    ...getBaseOptions(),
    scales: {
      x: {
        type: config.options.axes?.x?.type || "category",
        position: config.options.axes?.x?.position || "bottom",
        title: {
          display: true,
          text: config.options.axes?.x?.title,
        },
        stacked: config.options.stacked,
        time: config.options.timeUnit
          ? {
              unit: config.options.timeUnit,
            }
          : undefined,
      },
      y: Array.isArray(config.options.axes?.y)
        ? config.options.axes.y.map((axis) => ({
            type: axis.type || "linear",
            position: axis.position || "left",
            title: {
              display: true,
              text: axis.title,
            },
            stacked: axis.stacked,
          }))
        : {
            type: config.options.axes?.y?.type || "linear",
            position: config.options.axes?.y?.position || "left",
            title: {
              display: true,
              text: config.options.axes?.y?.title,
            },
            stacked: config.options.stacked,
          },
    },
  });

  const renderChart = () => {
    // Check if we have mixed chart types in datasets
    const hasMixedTypes = config.data.datasets.some(
      (d) => d.type && d.type !== config.type
    );

    if (hasMixedTypes) {
      // For mixed charts, always use Bar as base
      return (
        <Bar
          data={processBarData()}
          options={getCartesianOptions() as ChartOptions<"bar">}
        />
      );
    }

    // For single type charts
    switch (config.type) {
      case "bar":
        return (
          <Bar
            data={processBarData()}
            options={getCartesianOptions() as ChartOptions<"bar">}
          />
        );
      case "line":
        return (
          <Line
            data={processLineData()}
            options={getCartesianOptions() as ChartOptions<"line">}
          />
        );
      case "pie":
        return (
          <Pie
            data={processPieData()}
            options={getBaseOptions() as ChartOptions<"pie">}
          />
        );
      case "scatter":
        return (
          <Scatter
            data={processScatterData()}
            options={getCartesianOptions() as ChartOptions<"scatter">}
          />
        );
      default:
        return null;
    }
  };

  return <div className={`w-full h-[400px] ${className}`}>{renderChart()}</div>;
}
