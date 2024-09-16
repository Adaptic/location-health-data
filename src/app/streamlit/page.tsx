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
  healthConcern: string;
  prevalence: number;
  affected: number;
}

export default function CaringHandDashboard() {
  // Input states
  const [address, setAddress] = useState<string>('');
  const [attendance, setAttendance] = useState<number>(0);
  const [ageDistribution, setAgeDistribution] = useState<number>(70);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [results, setResults] = useState<HealthResult[]>([]);

  const childDistribution = 100 - ageDistribution;

  // Memoized chart data to avoid recalculating
  const cdcChartData = useMemo(() => {
    return {
      labels: [2018, 2019, 2020, 2021, 2022],
      datasets: [
        {
          label: 'Obesity (%)',
          data: [30.5, 31.2, 32.0, 32.5, 33.0],
          fill: false,
          borderColor: '#ff6384',
          tension: 0.1,
        },
        {
          label: 'Smoking (%)',
          data: [16.5, 16.0, 15.5, 15.2, 14.8],
          fill: false,
          borderColor: '#36a2eb',
          tension: 0.1,
        },
        {
          label: 'Diabetes (%)',
          data: [7.5, 7.8, 8.0, 8.3, 8.5],
          fill: false,
          borderColor: '#cc65fe',
          tension: 0.1,
        },
      ],
    };
  }, []);

  // Memoized CHNA data fetching
  const chnaData = useMemo(
    () => [
      { healthConcern: 'Hypertension', prevalence: 28.1 },
      { healthConcern: 'Asthma', prevalence: 12.4 },
      { healthConcern: 'Heart Disease', prevalence: 10.5 },
    ],
    [],
  );

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const combinedData: HealthResult[] = [
      {
        healthConcern: 'Obesity',
        prevalence: 33.0,
        affected: Math.floor((attendance * 33.0) / 100),
      },
      {
        healthConcern: 'Smoking',
        prevalence: 14.8,
        affected: Math.floor((attendance * 14.8) / 100),
      },
      {
        healthConcern: 'Diabetes',
        prevalence: 8.5,
        affected: Math.floor((attendance * 8.5) / 100),
      },
      {
        healthConcern: 'Hypertension',
        prevalence: 28.1,
        affected: Math.floor(
          ((attendance * 28.1) / 100) * (ageDistribution / 100),
        ),
      },
      {
        healthConcern: 'Asthma',
        prevalence: 12.4,
        affected: Math.floor(
          ((attendance * 12.4) / 100) * (childDistribution / 100),
        ),
      },
      {
        healthConcern: 'Heart Disease',
        prevalence: 10.5,
        affected: Math.floor(
          ((attendance * 10.5) / 100) * (ageDistribution / 100),
        ),
      },
    ];

    setResults(combinedData);
    setSubmitted(true);
  };

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
            Enter your church address to see community health data and trends.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="address" className="form-label">
                Church Address
              </label>
              <input
                type="text"
                className="form-control"
                id="address"
                placeholder="123 Church St, City, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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

          {submitted && (
            <>
              <h3 className="mt-5">Health Concern Trends Over Time</h3>
              <Line data={cdcChartData} />

              <h3 className="mt-5">
                Expected Number of People with Health Conditions
              </h3>
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Health Concern</th>
                    <th>Prevalence (%)</th>
                    <th>Estimated Affected People</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, index) => (
                    <tr key={index}>
                      <td>{item.healthConcern}</td>
                      <td>{item.prevalence}</td>
                      <td>{item.affected}</td>
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
