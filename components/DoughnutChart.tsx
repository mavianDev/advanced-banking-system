'use client'

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChart = ({accounts}: DoughnutChartProps) => {
    const data = {
        datasets: [
            {
                label: 'Banks',
                data: [1250, 3240, 5432],
                backgroundColor: ['#2674f5', '#074acc', '#02326a']
            }
        ],
        labels: ['Kaspi Bank', 'Swiss Bank', 'American Bank']
    }
    return <Doughnut
        data={data}
        options={{
            cutout: '50%',
            plugins: {
                legend: {
                    display: false
                }
            }
        }}
    />
}
export default DoughnutChart
