'use client';

import { useState, useMemo, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/Home.module.css';
import { adapticServer } from '@/utils/helpers';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface HealthResult {
  measure: string;
  data_value: number;
  year: string;
  low_confidence_limit: number;
  high_confidence_limit: number;
  category: string;
}

export default function CaringHandDashboard() {
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [attendance, setAttendance] = useState<number>(0);
  const [ageDistribution, setAgeDistribution] = useState<number>(70);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [results, setResults] = useState<HealthResult[]>([]);
  const [cdcChartData, setCdcChartData] = useState<any>(null);

  // Filters
  const [selectedMeasure, setSelectedMeasure] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const childDistribution = 100 - ageDistribution;

  const fetchCdcData = async () => {
    try {
      const response = await fetch(
        `${adapticServer}cdc-data?city=${city}&state=${state}`, // Call the Flask backend
      );

      const data = await response.json();

      if (data.length > 0) {
        const combinedData: HealthResult[] = data.map((item: any) => ({
          measure: item.measure,
          data_value: parseFloat(item.data_value),
          year: item.year,
          low_confidence_limit: parseFloat(item.low_confidence_limit),
          high_confidence_limit: parseFloat(item.high_confidence_limit),
          category: item.category,
        }));

        setResults(combinedData);

        // Group data by measure and prepare datasets for the chart
        const measures = Array.from(
          new Set(combinedData.map((item) => item.measure)),
        );
        const years = Array.from(
          new Set(combinedData.map((item) => item.year)),
        );

        const datasets = measures.map((measure) => {
          const measureData = combinedData
            .filter((item) => item.measure === measure)
            .sort((a, b) => parseInt(a.year) - parseInt(b.year));

          return {
            label: measure,
            data: measureData.map((item) => item.data_value),
            fill: false,
            borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Generate random colors
            tension: 0.1,
          };
        });

        setCdcChartData({
          labels: years,
          datasets: datasets,
        });
      } else {
        alert('No data found for the given city and state.');
      }
    } catch (error) {
      console.error('Error fetching data from backend:', error);
      alert('Error fetching data. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchCdcData();
    setSubmitted(true);
  };

  // Filtered data for the table
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const matchMeasure =
        selectedMeasure === 'All' || item.measure === selectedMeasure;
      const matchCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      return matchMeasure && matchCategory;
    });
  }, [results, selectedMeasure, selectedCategory]);

  // Filtered data for the chart
  const filteredChartData = useMemo(() => {
    if (!cdcChartData) return null;

    const filteredDatasets = cdcChartData.datasets.filter((dataset: any) => {
      const matchMeasure =
        selectedMeasure === 'All' || dataset.label === selectedMeasure;
      return matchMeasure;
    });

    return {
      ...cdcChartData,
      datasets: filteredDatasets,
    };
  }, [cdcChartData, selectedMeasure]);

  // Get unique measures and categories for dropdown options
  const uniqueMeasures = Array.from(
    new Set(results.map((item) => item.measure)),
  );
  const uniqueCategories = Array.from(
    new Set(results.map((item) => item.category)),
  );

  return (
    <div
      className={`d-flex flex-column justify-content-center align-items-center ${styles.page}`}
    >
      <div className={`container ${styles.content}`}>
        <div className="col-12 col-md-8">
          <h1 className={`text-center ${styles.header}`}>
            CaringHand Health Data Dashboard
          </h1>
          <p className="text-center">
            Enter your city and state to see community health data and trends.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="city" className="form-label">
                City
              </label>
              <input
                type="text"
                className="form-control"
                id="city"
                placeholder="Enter city name"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="state" className="form-label">
                State Abbreviation
              </label>
              <input
                type="text"
                className="form-control"
                id="state"
                placeholder="Enter state abbreviation (e.g., AL)"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="attendance" className="form-label">
                Total Church Attendance
              </label>
              <input
                type="number"
                className="form-control"
                id="attendance"
                value={attendance}
                onChange={(e) => setAttendance(parseInt(e.target.value, 10))}
                required
                min="0"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Percent of Adults</label>
              <input
                type="range"
                className="form-range"
                min="0"
                max="100"
                value={ageDistribution}
                onChange={(e) =>
                  setAgeDistribution(parseInt(e.target.value, 10))
                }
              />
              <p>
                Adults: {ageDistribution}%, Children: {childDistribution}%
              </p>
            </div>

            <button
              type="submit"
              className={`btn btn-success ${styles.button}`}
            >
              Submit
            </button>
          </form>

          {submitted && results.length > 0 && (
            <>
              <div className="mt-5 mb-3">
                <label htmlFor="measureFilter" className="form-label">
                  Filter by Health Concern (Measure)
                </label>
                <select
                  id="measureFilter"
                  className="form-select"
                  value={selectedMeasure}
                  onChange={(e) => setSelectedMeasure(e.target.value)}
                >
                  <option value="All">All</option>
                  {uniqueMeasures.map((measure, index) => (
                    <option key={index} value={measure}>
                      {measure}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="categoryFilter" className="form-label">
                  Filter by Category
                </label>
                <select
                  id="categoryFilter"
                  className="form-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All</option>
                  {uniqueCategories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <h3 className="mt-5">Health Concern Trends Over Time</h3>
              {filteredChartData && <Line data={filteredChartData} />}

              <h3 className="mt-5">
                Health Data for {city}, {state}
              </h3>
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Health Concern</th>
                    <th>Prevalence (%)</th>
                    <th>Low Confidence Limit (%)</th>
                    <th>High Confidence Limit (%)</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((item, index) => (
                    <tr key={index}>
                      <td>{item.measure}</td>
                      <td>{item.data_value}</td>
                      <td>{item.low_confidence_limit}</td>
                      <td>{item.high_confidence_limit}</td>
                      <td>{item.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
