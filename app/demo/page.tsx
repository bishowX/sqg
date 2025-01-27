"use client";

import { useState } from "react";
import { QueryInput } from "@/app/components/query-input";
import {
  generateQuery,
  runGeneratedSQLQuery,
  type QueryResult,
} from "../actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataChart } from "@/app/components/data-chart";
import type { ChartConfig } from "../services/ai.service";

type QueryState = {
  query: string | null;
  results: any[] | null;
  chart: ChartConfig | null;
  error: string | null;
  isLoading: boolean;
};

export default function Demo() {
  const [queryState, setQueryState] = useState<QueryState>({
    query: null,
    results: null,
    chart: null,
    error: null,
    isLoading: false,
  });

  const handleQueryGeneration = async (input: string) => {
    setQueryState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const queryResult = await generateQuery(input);

      if (!queryResult.success || !queryResult.data) {
        throw new Error(
          queryResult.error?.message || "Failed to generate query"
        );
      }

      const query = queryResult.data;
      setQueryState((prev) => ({ ...prev, query }));

      const executionResult = await runGeneratedSQLQuery(query, input);

      if (!executionResult.success || !executionResult.data) {
        throw new Error(
          executionResult.error?.message || "Failed to execute query"
        );
      }

      const result: QueryResult = executionResult.data;
      setQueryState((prev) => ({
        ...prev,
        results: result.data,
        chart: result.chart || null,
        isLoading: false,
      }));
    } catch (error: any) {
      setQueryState((prev) => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl py-8 mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">SQL Query Demo</h1>

      <QueryInput
        onSubmit={handleQueryGeneration}
        isLoading={queryState.isLoading}
      />

      {queryState.error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{queryState.error}</AlertDescription>
        </Alert>
      )}

      {queryState.query && (
        <div className="p-4 space-y-2 border rounded-lg">
          <h2 className="font-semibold">Generated Query:</h2>
          <pre className="p-2 overflow-x-auto bg-gray-100 rounded">
            {queryState.query}
          </pre>
        </div>
      )}

      {queryState.chart && (
        <div className="p-4 space-y-2 border rounded-lg">
          <h2 className="font-semibold">Data Visualization:</h2>
          <DataChart config={queryState.chart} />
        </div>
      )}

      {queryState.results && (
        <div className="p-4 space-y-2 border rounded-lg">
          <h2 className="font-semibold">Results:</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {Object.keys(queryState.results[0] || {}).map((key) => (
                    <th key={key} className="p-2 text-left border">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryState.results.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((value: any, j) => (
                      <td key={j} className="p-2 border">
                        {value?.toString() || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
