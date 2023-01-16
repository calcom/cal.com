import { Card, Title, LineChart } from "@tremor/react";

const chartdata = [
  {
    year: 1951,
    "Population growth rate": 1.74,
  },
  {
    year: 1952,
    "Population growth rate": 1.93,
  },
  {
    year: 1953,
    "Population growth rate": 1.9,
  },
  {
    year: 1954,
    "Population growth rate": 1.98,
  },
  {
    year: 1955,
    "Population growth rate": 2,
  },
];

const dataFormatter = (number: number) => `${Intl.NumberFormat("us").format(number).toString()}%`;

export default function BarChart() {
  return (
    <Card>
      <Title>Population growth rate (1951 to 2021)</Title>
      <LineChart
        data={chartdata}
        dataKey="year"
        categories={["Population growth rate"]}
        colors={["blue"]}
        valueFormatter={dataFormatter}
        marginTop="mt-6"
        yAxisWidth="w-10"
      />
    </Card>
  );
}
