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
  nationwide_value: number | null;
  community_input?: number; // Field for user input
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

      if (data.city_state_data.length > 0 || data.nationwide_data.length > 0) {
        // Create a map of nationwide data for easy access by measure and year
        const nationwideMap = new Map();
        data.nationwide_data.forEach((item: any) => {
          const key = `${item.measure}_${item.year}`;
          nationwideMap.set(key, parseFloat(item.data_value));
        });

        // Combine the city/state-specific data with corresponding nationwide data
        const combinedData: HealthResult[] = data.city_state_data.map(
          (item: any) => {
            const nationwideKey = `${item.measure}_${item.year}`;
            return {
              measure: item.measure,
              data_value: parseFloat(item.data_value),
              year: item.year,
              low_confidence_limit: parseFloat(item.low_confidence_limit),
              high_confidence_limit: parseFloat(item.high_confidence_limit),
              category: item.category,
              nationwide_value: nationwideMap.get(nationwideKey) || null, // Add nationwide data here
            };
          },
        );

        setResults(combinedData);

        // Prepare datasets for the chart
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

  // Filtered and sorted data for the table
  const filteredResults = useMemo(() => {
    const filtered = results.filter((item) => {
      const matchMeasure =
        selectedMeasure === 'All' || item.measure === selectedMeasure;
      const matchCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      return matchMeasure && matchCategory;
    });

    // Sort by data_value in descending order
    return filtered.sort((a, b) => b.data_value - a.data_value);
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
                City / County
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

              <h3 className="mt-5">
                Health Data for {city}, {state}
              </h3>
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Health Concern</th>
                    <th>Community Input (%)</th>{' '}
                    {/* Moved to the second column */}
                    <th>Prevalence (%)</th>
                    <th>US Prevalence (%)</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((item, index) => (
                    <tr key={index}>
                      <td>{item.measure}</td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Enter value"
                          value={item.community_input || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setResults((prevResults) =>
                              prevResults.map((res, i) =>
                                i === index
                                  ? { ...res, community_input: value }
                                  : res,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td>
                        {item.data_value}{' '}
                        {item.nationwide_value !== null && (
                          <span>
                            {item.data_value > item.nationwide_value
                              ? '↑'
                              : '↓'}
                          </span>
                        )}
                      </td>
                      <td>
                        {item.nationwide_value !== null
                          ? item.nationwide_value
                          : 'N/A'}
                      </td>
                      <td>{item.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="mt-5">Interactive Health Outcomes Map</h3>
              <div className="mb-5">
                <iframe
                  src="https://experience.arcgis.com/experience/dc15b033b88e423d85808ce04bd7a497/page/Health-Outcomes/?org=cdcarcgis&views=Arthritis&org=cdcarcgis"
                  width="100%"
                  height="600px"
                  style={{ border: 'none' }}
                  title="Interactive Health Outcomes Map"
                  allowFullScreen
                ></iframe>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
