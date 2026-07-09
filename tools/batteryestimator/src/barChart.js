import React, { Component } from 'react';
import ApexChart from "react-apexcharts";

const barChartOptions = {
    chart: {
        height: 350,
        toolbar: { show: false },
        type: 'bar',
        zoom: { enabled: false }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' },
    grid: {
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5
      },
    },
    yaxis: [
        {
            labels: { formatter: v => v.toFixed(0) }
        }
    ]
};

export default class BarChart extends Component {
    render() {
        const series = [
            {
                name: "Max Samples",
                data: this.props.data
            }
        ];
        return (
            <ApexChart
                options={barChartOptions}
                series={series}
                type="bar"
                width="450"
            />
        )
    }
}
